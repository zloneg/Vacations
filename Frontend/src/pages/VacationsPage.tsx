import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import "../App.css";

type Vacation = {
  id: number;
  destination: string;
  description: string;
  startDate: string;
  endDate: string;
  price: string;
  imageName: string;
  likesCount: number;
};

type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

type FilterType = "all" | "liked" | "current" | "future";

type VacationForm = {
  destination: string;
  description: string;
  startDate: string;
  endDate: string;
  price: string;
  imageUrl: string;
  imageFileName: string;
  imageFile: File | null;
};

const ITEMS_PER_PAGE = 9;

function createEmptyForm(): VacationForm {
  return {
    destination: "",
    description: "",
    startDate: "",
    endDate: "",
    price: "",
    imageUrl: "",
    imageFileName: "",
    imageFile: null
  };
}

function isExternalImage(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function formatDisplayDate(dateString: string): string {
  const clean = dateString.slice(0, 10);
  const parts = clean.split("-");
  if (parts.length !== 3) return clean;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function resolveImageSrc(imageName: string): string {
  if (!imageName) return "/images/placeholder.jpg";
  if (isExternalImage(imageName)) return imageName;
  return `http://localhost:4000/images/${imageName}`;
}

function splitImageValue(imageName: string): { imageUrl: string; imageFileName: string } {
  if (!imageName) {
    return { imageUrl: "", imageFileName: "" };
  }

  if (isExternalImage(imageName)) {
    return { imageUrl: imageName, imageFileName: "" };
  }

  return { imageUrl: "", imageFileName: imageName };
}

function buildVacationFormData(form: VacationForm): FormData {
  const formData = new FormData();

  formData.append("destination", form.destination);
  formData.append("description", form.description);
  formData.append("startDate", form.startDate);
  formData.append("endDate", form.endDate);
  formData.append("price", form.price);

  if (form.imageUrl.trim()) {
    formData.append("imageUrl", form.imageUrl.trim());
  }

  if (form.imageFile) {
    formData.append("image", form.imageFile);
  } else if (form.imageFileName.trim()) {
    formData.append("imageName", form.imageFileName.trim());
  }

  return formData;
}

function VacationsPage() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem("user");
  const currentUser: User | null = storedUser ? JSON.parse(storedUser) : null;

  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [likedIds, setLikedIds] = useState<number[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  const [editingVacationId, setEditingVacationId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<VacationForm>(createEmptyForm());
  const [addForm, setAddForm] = useState<VacationForm>(createEmptyForm());

  const isAdmin = currentUser?.role === "admin";

  const userFullName = useMemo(() => {
    if (!currentUser) return "";
    return `${currentUser.firstName} ${currentUser.lastName}`;
  }, [currentUser]);

  const today = useMemo(() => {
    return new Date().toISOString().slice(0, 10);
  }, []);

  const filteredVacations = useMemo(() => {
    if (filter === "all") return vacations;

    if (filter === "liked") {
      return vacations.filter((vacation) => likedIds.includes(vacation.id));
    }

    if (filter === "current") {
      return vacations.filter(
        (vacation) =>
          vacation.startDate.slice(0, 10) <= today &&
          vacation.endDate.slice(0, 10) >= today
      );
    }

    if (filter === "future") {
      return vacations.filter((vacation) => vacation.startDate.slice(0, 10) > today);
    }

    return vacations;
  }, [filter, vacations, likedIds, today]);

  const totalPages = Math.max(1, Math.ceil(filteredVacations.length / ITEMS_PER_PAGE));

  const paginatedVacations = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVacations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredVacations, currentPage]);

  function showSuccess(message: string) {
    setSuccessMessage(message);

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  }

  async function loadVacations() {
    const response = await api.get("/vacations");
    setVacations(response.data);
  }

  async function loadLikedVacations() {
    if (!currentUser || isAdmin) {
      setLikedIds([]);
      return;
    }

    const response = await api.get(`/likes/${currentUser.id}`);
    const ids = response.data.map((item: { vacationId: number }) => item.vacationId);
    setLikedIds(ids);
  }

  async function loadPageData() {
    try {
      setError("");
      setLoading(true);
      await Promise.all([loadVacations(), loadLikedVacations()]);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load vacations");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleLike(vacationId: number) {
    if (!currentUser || isAdmin) return;

    try {
      setBusyId(vacationId);

      const isLiked = likedIds.includes(vacationId);

      if (isLiked) {
        await api.delete(`/likes/${vacationId}/${currentUser.id}`);

        setLikedIds((prev) => prev.filter((id) => id !== vacationId));
        setVacations((prev) =>
          prev.map((vacation) =>
            vacation.id === vacationId
              ? { ...vacation, likesCount: Math.max(0, Number(vacation.likesCount) - 1) }
              : vacation
          )
        );
      } else {
        await api.post(`/likes/${vacationId}/${currentUser.id}`);

        setLikedIds((prev) => [...prev, vacationId]);
        setVacations((prev) =>
          prev.map((vacation) =>
            vacation.id === vacationId
              ? { ...vacation, likesCount: Number(vacation.likesCount) + 1 }
              : vacation
          )
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update like");
    } finally {
      setBusyId(null);
    }
  }

  function startEditing(vacation: Vacation) {
    const imageData = splitImageValue(vacation.imageName);

    setEditingVacationId(vacation.id);
    setEditForm({
      destination: vacation.destination,
      description: vacation.description,
      startDate: vacation.startDate.slice(0, 10),
      endDate: vacation.endDate.slice(0, 10),
      price: String(vacation.price),
      imageUrl: imageData.imageUrl,
      imageFileName: imageData.imageFileName,
      imageFile: null
    });
    setError("");
    setSuccessMessage("");
  }

  function cancelEditing() {
    setEditingVacationId(null);
    setEditForm(createEmptyForm());
  }

  function clearAddForm() {
    setAddForm(createEmptyForm());
  }

  function handleAddFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;

    setAddForm((prev) => ({
      ...prev,
      imageFile: file,
      imageFileName: file ? file.name : ""
    }));
  }

  function handleEditFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;

    setEditForm((prev) => ({
      ...prev,
      imageFile: file,
      imageFileName: file ? file.name : prev.imageFileName
    }));
  }

  async function saveEdit(vacationId: number) {
    try {
      setBusyId(vacationId);
      setError("");
      setSuccessMessage("");

      if (!editForm.imageUrl.trim() && !editForm.imageFile && !editForm.imageFileName.trim()) {
        setError("Please provide an image URL or choose an image file.");
        return;
      }

      const formData = buildVacationFormData(editForm);

      await api.put(`/vacations/${vacationId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      await loadVacations();
      cancelEditing();
      showSuccess("Vacation updated successfully.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update vacation");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(vacationId: number) {
    const confirmed = window.confirm("Delete this vacation?");
    if (!confirmed) return;

    try {
      setBusyId(vacationId);
      setError("");
      setSuccessMessage("");

      await api.delete(`/vacations/${vacationId}`);

      setVacations((prev) => prev.filter((vacation) => vacation.id !== vacationId));
      setLikedIds((prev) => prev.filter((id) => id !== vacationId));

      if (editingVacationId === vacationId) {
        cancelEditing();
      }

      showSuccess("Vacation deleted successfully.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete vacation");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAddVacation(e: FormEvent) {
    e.preventDefault();

    try {
      setAdding(true);
      setError("");
      setSuccessMessage("");

      if (!addForm.imageUrl.trim() && !addForm.imageFile && !addForm.imageFileName.trim()) {
        setError("Please provide an image URL or choose an image file.");
        return;
      }

      const formData = buildVacationFormData(addForm);

      await api.post("/vacations", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      clearAddForm();
      await loadVacations();
      showSuccess("Vacation added successfully.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add vacation");
    } finally {
      setAdding(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }

  function pageButtonStyle(page: number) {
    const active = currentPage === page;

    return {
      minWidth: "44px",
      height: "44px",
      borderRadius: "12px",
      border: active ? "1px solid #55acee" : "1px solid #999",
      background: active ? "#eaf6ff" : "#fff",
      color: active ? "#1d6fb8" : "#333",
      fontWeight: active ? 700 : 500,
      cursor: "pointer"
    } as const;
  }

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0 20px 30px",
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1320px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
      >
        <header
          style={{
            width: "100%",
            borderBottom: "1px solid #d9d9d9",
            padding: "18px 0",
            marginBottom: "28px"
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap"
            }}
          >
            <div
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "#2f7fd8"
              }}
            >
              ✈ Your next getaway starts here
            </div>

            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </div>
        </header>

        <div
          style={{
            width: "100%",
            maxWidth: "700px",
            background: "#fff",
            border: "1px solid #d8d8d8",
            borderRadius: "28px",
            padding: "26px 24px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.05)",
            textAlign: "center",
            marginBottom: "18px"
          }}
        >
          {currentUser && (
            <>
              <p style={{ margin: "0 0 10px", fontSize: "30px", fontWeight: 600 }}>
                Welcome, <strong>{userFullName}</strong>
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "8px",
                  color: "#555",
                  fontSize: "18px"
                }}
              >
                <span
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    background: "#27c93f",
                    boxShadow:
                      "0 0 0 4px rgba(39, 201, 63, 0.12), 0 0 10px rgba(39, 201, 63, 0.55)",
                    display: "inline-block"
                  }}
                />
                <span>
                  Role: <strong>{currentUser.role}</strong>
                </span>
              </div>
            </>
          )}

          {isAdmin && (
            <p
              style={{
                marginTop: "14px",
                marginBottom: 0,
                color: "#8a6500",
                fontWeight: 700,
                fontSize: "17px"
              }}
            >
              Admin mode is active
            </p>
          )}
        </div>

        <div
          style={{
            marginBottom: "20px",
            textAlign: "center",
            maxWidth: "900px"
          }}
        >
          <h1
            style={{
              margin: "0 0 14px",
              fontSize: "72px",
              lineHeight: 1,
              fontWeight: 700
            }}
          >
            Vacations
          </h1>

          <p
            style={{
              margin: 0,
              fontSize: "20px",
              lineHeight: 1.7,
              color: "#555"
            }}
          >
            Choose your dream vacation and explore the best options for your next getaway.
          </p>
        </div>

        <div
          style={{
            width: "100%",
            maxWidth: "340px",
            marginBottom: "18px"
          }}
        >
          <label
            htmlFor="vacation-filter"
            style={{
              display: "block",
              textAlign: "center",
              marginBottom: "8px",
              fontWeight: 600,
              color: "#555"
            }}
          >
            Filter vacations
          </label>

          <select
            id="vacation-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            style={{
              width: "100%",
              padding: "13px 16px",
              borderRadius: "14px",
              border: "1px solid #a9a9a9",
              background: "#fff",
              fontSize: "16px",
              fontWeight: 500,
              outline: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.04)"
            }}
          >
            <option value="all">All Vacations</option>
            {!isAdmin && <option value="liked">Liked Vacations</option>}
            <option value="current">Current Vacations</option>
            <option value="future">Future Vacations</option>
          </select>
        </div>

        <div className="top-action-buttons">
          <button
            onClick={() => navigate("/ai-recommendation")}
            className="top-action-btn"
          >
            AI Recommendation
          </button>

          <button
            onClick={() => navigate("/mcp")}
            className="top-action-btn"
          >
            Travel Q&A
          </button>

          {isAdmin && (
            <button
              onClick={() => navigate("/reports")}
              className="top-action-btn"
            >
              Open Reports
            </button>
          )}
        </div>

        {isAdmin && (
          <form
            onSubmit={handleAddVacation}
            style={{
              width: "100%",
              maxWidth: "760px",
              marginTop: "6px",
              marginBottom: "14px",
              border: "1px solid #ccc",
              borderRadius: "20px",
              padding: "22px",
              boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
              background: "#fff",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            <h2 style={{ margin: 0, textAlign: "center", fontSize: "24px" }}>Add Vacation</h2>

            <input
              type="text"
              placeholder="Destination"
              value={addForm.destination}
              onChange={(e) =>
                setAddForm((prev) => ({ ...prev, destination: e.target.value }))
              }
              style={{ padding: "12px" }}
            />

            <textarea
              placeholder="Description"
              rows={3}
              value={addForm.description}
              onChange={(e) =>
                setAddForm((prev) => ({ ...prev, description: e.target.value }))
              }
              style={{ padding: "12px" }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px"
              }}
            >
              <input
                type="date"
                value={addForm.startDate}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, startDate: e.target.value }))
                }
                style={{ padding: "12px" }}
              />

              <input
                type="date"
                value={addForm.endDate}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, endDate: e.target.value }))
                }
                style={{ padding: "12px" }}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px"
              }}
            >
              <input
                type="number"
                placeholder="Price"
                value={addForm.price}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, price: e.target.value }))
                }
                style={{ padding: "12px" }}
              />

              <input
                type="url"
                placeholder="Image URL (https://...)"
                value={addForm.imageUrl}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                }
                style={{ padding: "12px" }}
              />
            </div>

            <div className="upload-section">
              <p className="upload-section-title">Upload vacation image</p>

              <label className="upload-box">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAddFileChange}
                  className="upload-input-hidden"
                />

                <span className="upload-icon">🖼️</span>
                <span className="upload-main-text">
                  {addForm.imageFileName ? "Change selected image" : "Click here to upload an image"}
                </span>
                <span className="upload-sub-text">
                  {addForm.imageFileName || "PNG, JPG or JPEG"}
                </span>
              </label>

              <p className="selected-file-text">
                {addForm.imageFileName
                  ? `Selected file: ${addForm.imageFileName}`
                  : "No file selected yet"}
              </p>
            </div>

            {successMessage && (
              <p className="success-message">
                {successMessage}
              </p>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                flexWrap: "wrap"
              }}
            >
              <button
                type="submit"
                disabled={adding}
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  border: "1px solid #888",
                  cursor: "pointer",
                  minWidth: "160px"
                }}
              >
                {adding ? "Adding..." : "Add Vacation"}
              </button>

              <button
                type="button"
                onClick={clearAddForm}
                disabled={adding}
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  border: "1px solid #888",
                  cursor: "pointer",
                  minWidth: "120px"
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loading && <p style={{ marginTop: "16px" }}>Loading...</p>}
        {!loading && !error && filteredVacations.length === 0 && (
          <p style={{ marginTop: "16px" }}>No vacations found for this filter.</p>
        )}
        {error && <p style={{ color: "red", marginTop: "16px" }}>{error}</p>}

        <div
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 340px))",
            justifyContent: "center",
            gap: "22px",
            marginTop: "20px"
          }}
        >
          {paginatedVacations.map((vacation) => {
            const isLiked = likedIds.includes(vacation.id);
            const isEditing = editingVacationId === vacation.id;

            return (
              <div
                key={vacation.id}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "18px",
                  overflow: "hidden",
                  textAlign: "center",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
                  background: "#fff"
                }}
              >
                {!isEditing && (
                  <img
                    src={resolveImageSrc(vacation.imageName)}
                    alt={vacation.destination}
                    style={{
                      width: "100%",
                      height: "190px",
                      objectFit: "cover",
                      display: "block"
                    }}
                    onError={(e) => {
                      e.currentTarget.src = "/images/placeholder.jpg";
                    }}
                  />
                )}

                <div style={{ padding: "20px" }}>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editForm.destination}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, destination: e.target.value }))
                        }
                        placeholder="Destination"
                        style={{
                          width: "100%",
                          padding: "10px",
                          marginBottom: "10px",
                          boxSizing: "border-box"
                        }}
                      />

                      <textarea
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="Description"
                        rows={3}
                        style={{
                          width: "100%",
                          padding: "10px",
                          marginBottom: "10px",
                          boxSizing: "border-box"
                        }}
                      />

                      <input
                        type="date"
                        value={editForm.startDate}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, startDate: e.target.value }))
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          marginBottom: "10px",
                          boxSizing: "border-box"
                        }}
                      />

                      <input
                        type="date"
                        value={editForm.endDate}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, endDate: e.target.value }))
                        }
                        style={{
                          width: "100%",
                          padding: "10px",
                          marginBottom: "10px",
                          boxSizing: "border-box"
                        }}
                      />

                      <input
                        type="number"
                        value={editForm.price}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, price: e.target.value }))
                        }
                        placeholder="Price"
                        style={{
                          width: "100%",
                          padding: "10px",
                          marginBottom: "10px",
                          boxSizing: "border-box"
                        }}
                      />

                      <input
                        type="url"
                        value={editForm.imageUrl}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                        }
                        placeholder="Image URL (https://...)"
                        style={{
                          width: "100%",
                          padding: "10px",
                          marginBottom: "10px",
                          boxSizing: "border-box"
                        }}
                      />

                      <div className="upload-section" style={{ marginTop: "4px" }}>
                        <p className="upload-section-title">Upload vacation image</p>

                        <label className="upload-box">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleEditFileChange}
                            className="upload-input-hidden"
                          />

                          <span className="upload-icon">🖼️</span>
                          <span className="upload-main-text">
                            {editForm.imageFileName ? "Change selected image" : "Click here to upload an image"}
                          </span>
                          <span className="upload-sub-text">
                            {editForm.imageFileName || "PNG, JPG or JPEG"}
                          </span>
                        </label>

                        <p className="selected-file-text">
                          {editForm.imageFileName
                            ? `Selected file: ${editForm.imageFileName}`
                            : "No file selected yet"}
                        </p>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "10px",
                          flexWrap: "wrap"
                        }}
                      >
                        <button
                          onClick={() => saveEdit(vacation.id)}
                          disabled={busyId === vacation.id}
                          style={{
                            padding: "10px 16px",
                            borderRadius: "10px",
                            border: "1px solid #888",
                            cursor: "pointer"
                          }}
                        >
                          {busyId === vacation.id ? "Saving..." : "Save"}
                        </button>

                        <button
                          onClick={cancelEditing}
                          disabled={busyId === vacation.id}
                          style={{
                            padding: "10px 16px",
                            borderRadius: "10px",
                            border: "1px solid #888",
                            cursor: "pointer"
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3 style={{ marginTop: 0, fontSize: "34px" }}>{vacation.destination}</h3>

                      <p>{vacation.description}</p>
                      <p>Start: {formatDisplayDate(vacation.startDate)}</p>
                      <p>End: {formatDisplayDate(vacation.endDate)}</p>
                      <p>Price: {vacation.price}</p>
                      <p>
                        Likes: <strong>{vacation.likesCount}</strong>
                      </p>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                          marginTop: "12px"
                        }}
                      >
                        {!isAdmin && (
                          <button
                            onClick={() => handleToggleLike(vacation.id)}
                            disabled={busyId === vacation.id}
                            style={{
                              width: "52px",
                              height: "52px",
                              borderRadius: "50%",
                              border: isLiked ? "1px solid #e57373" : "1px solid #bdbdbd",
                              background: "#fff",
                              cursor: "pointer",
                              fontSize: "28px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "0.2s"
                            }}
                            title={isLiked ? "Remove like" : "Like"}
                          >
                            {busyId === vacation.id ? "..." : (
                              <span style={{ color: isLiked ? "#e53935" : "#999" }}>
                                {isLiked ? "♥" : "♡"}
                              </span>
                            )}
                          </button>
                        )}

                        {isAdmin && (
                          <>
                            <button
                              onClick={() => startEditing(vacation)}
                              disabled={busyId === vacation.id}
                              style={{
                                padding: "10px 16px",
                                borderRadius: "10px",
                                border: "1px solid #888",
                                cursor: "pointer",
                                minWidth: "90px"
                              }}
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => handleDelete(vacation.id)}
                              disabled={busyId === vacation.id}
                              style={{
                                padding: "10px 16px",
                                borderRadius: "10px",
                                border: "1px solid #b44",
                                cursor: "pointer",
                                minWidth: "90px"
                              }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!loading && !error && filteredVacations.length > 0 && totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "28px",
              marginBottom: "20px"
            }}
          >
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "1px solid #999",
                cursor: currentPage === 1 ? "default" : "pointer",
                opacity: currentPage === 1 ? 0.5 : 1
              }}
            >
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={pageButtonStyle(page)}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "1px solid #999",
                cursor: currentPage === totalPages ? "default" : "pointer",
                opacity: currentPage === totalPages ? 0.5 : 1
              }}
            >
              Next
            </button>
          </div>
        )}

        <footer
          style={{
            width: "100%",
            borderTop: "1px solid #d9d9d9",
            marginTop: "18px",
            padding: "22px 0 6px",
            color: "#777",
            fontSize: "15px",
            textAlign: "center"
          }}
        >
          Vacation Explorer • Full Stack Project
        </footer>
      </div>
    </div>
  );
}

export default VacationsPage;