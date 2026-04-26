import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import api from "../services/api";
import "../App.css";

type SummaryResponse = {
  usersCount: number;
  vacationsCount: number;
  likesCount: number;
};

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

function formatDisplayDate(dateString: string): string {
  const clean = dateString.slice(0, 10);
  const parts = clean.split("-");
  if (parts.length !== 3) return clean;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function ReportsPage() {
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement | null>(null);

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [error, setError] = useState("");

  async function loadReportsData() {
    try {
      setLoading(true);
      setError("");

      const [summaryResponse, vacationsResponse] = await Promise.all([
        api.get("/reports/summary"),
        api.get("/vacations")
      ]);

      setSummary(summaryResponse.data);
      setVacations(vacationsResponse.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadCsv() {
    try {
      setDownloadingCsv(true);

      const response = await api.get("/reports/vacations-csv", {
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "vacation-likes-report.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to download CSV.");
    } finally {
      setDownloadingCsv(false);
    }
  }

  async function handleDownloadPdf() {
    if (!reportRef.current) return;

    try {
      setDownloadingPdf(true);

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight - 20;
      }

      pdf.save("vacations-report.pdf");
    } catch (err) {
      console.error(err);
      setError("Failed to download PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  useEffect(() => {
    loadReportsData();
  }, []);

  const maxLikes = Math.max(...vacations.map((v) => Number(v.likesCount)), 1);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        style={{
          width: "92%",
          maxWidth: "1100px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          flex: 1
        }}
      >
        <header
          style={{
            width: "100%",
            borderBottom: "1px solid #d9d9d9",
            padding: "18px 0",
            marginTop: "24px",
            marginBottom: "28px",
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
            ✈ Vacation Explorer
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              flexWrap: "wrap"
            }}
          >
            <Link to="/vacations" className="utility-back-link">
              ← Back to Vacations
            </Link>

            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </div>
        </header>

        <main
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            paddingBottom: "24px"
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "980px",
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: "24px",
              padding: "32px",
              boxShadow: "0 10px 28px rgba(0,0,0,0.05)"
            }}
          >
            <h1
              style={{
                margin: "0 0 10px",
                textAlign: "center",
                fontSize: "56px",
                lineHeight: 1
              }}
            >
              Reports
            </h1>

            <p
              style={{
                margin: "0 0 24px",
                textAlign: "center",
                color: "#666",
                fontSize: "18px",
                lineHeight: 1.6
              }}
            >
              View reports, export data, and track vacation activity.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginBottom: "28px"
              }}
            >
              <button
                type="button"
                className="top-action-btn"
                onClick={handleDownloadCsv}
                disabled={downloadingCsv || loading}
              >
                {downloadingCsv ? "Downloading CSV..." : "Download CSV"}
              </button>

              <button
                type="button"
                className="top-action-btn"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf || loading}
              >
                {downloadingPdf ? "Downloading PDF..." : "Download PDF"}
              </button>
            </div>

            {error && (
              <p
                style={{
                  color: "red",
                  textAlign: "center",
                  marginTop: "8px",
                  marginBottom: "16px",
                  fontWeight: 500
                }}
              >
                {error}
              </p>
            )}

            {loading && (
              <p
                style={{
                  textAlign: "center",
                  fontSize: "18px",
                  color: "#555"
                }}
              >
                Loading reports...
              </p>
            )}

            {!loading && summary && (
              <div ref={reportRef}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "16px",
                    marginBottom: "28px"
                  }}
                >
                  <div
                    style={{
                      background: "#f8fbff",
                      border: "1px solid #d9e8ff",
                      borderRadius: "18px",
                      padding: "22px",
                      textAlign: "center"
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px",
                        color: "#666",
                        fontWeight: 600
                      }}
                    >
                      Users
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "34px",
                        fontWeight: 700
                      }}
                    >
                      {summary.usersCount}
                    </p>
                  </div>

                  <div
                    style={{
                      background: "#f8fbff",
                      border: "1px solid #d9e8ff",
                      borderRadius: "18px",
                      padding: "22px",
                      textAlign: "center"
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px",
                        color: "#666",
                        fontWeight: 600
                      }}
                    >
                      Vacations
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "34px",
                        fontWeight: 700
                      }}
                    >
                      {summary.vacationsCount}
                    </p>
                  </div>

                  <div
                    style={{
                      background: "#f8fbff",
                      border: "1px solid #d9e8ff",
                      borderRadius: "18px",
                      padding: "22px",
                      textAlign: "center"
                    }}
                  >
                    <p
                      style={{
                        margin: "0 0 8px",
                        color: "#666",
                        fontWeight: 600
                      }}
                    >
                      Likes
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "34px",
                        fontWeight: 700
                      }}
                    >
                      {summary.likesCount}
                    </p>
                  </div>
                </div>

                <section
                  style={{
                    border: "1px solid #d9e8ff",
                    borderRadius: "18px",
                    padding: "22px",
                    background: "#f8fbff",
                    marginBottom: "28px"
                  }}
                >
                  <h2
                    style={{
                      margin: "0 0 18px",
                      fontSize: "28px",
                      textAlign: "center"
                    }}
                  >
                    Likes per Vacation
                  </h2>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-end",
                      justifyContent: "space-between",
                      gap: "12px",
                      minHeight: "260px",
                      padding: "10px 4px 0"
                    }}
                  >
                    {vacations.map((vacation) => {
                      const likes = Number(vacation.likesCount);
                      const height = Math.max((likes / maxLikes) * 180, likes > 0 ? 24 : 8);

                      return (
                        <div
                          key={vacation.id}
                          style={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            minWidth: 0
                          }}
                        >
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: "#2f7fd8",
                              marginBottom: "6px"
                            }}
                          >
                            {likes}
                          </div>

                          <div
                            style={{
                              width: "100%",
                              maxWidth: "48px",
                              height: `${height}px`,
                              background: "linear-gradient(180deg, #79beff 0%, #4f9de8 100%)",
                              borderRadius: "12px 12px 0 0",
                              boxShadow: "0 4px 10px rgba(79,157,232,0.18)"
                            }}
                          />

                          <div
                            style={{
                              marginTop: "10px",
                              fontSize: "12px",
                              color: "#555",
                              textAlign: "center",
                              lineHeight: 1.4,
                              wordBreak: "break-word"
                            }}
                          >
                            {vacation.destination}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section
                  style={{
                    border: "1px solid #d9e8ff",
                    borderRadius: "18px",
                    padding: "22px",
                    background: "#ffffff"
                  }}
                >
                  <h2
                    style={{
                      margin: "0 0 18px",
                      fontSize: "28px",
                      textAlign: "center"
                    }}
                  >
                    Vacation Table
                  </h2>

                  <div
                    style={{
                      overflowX: "auto"
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: "760px"
                      }}
                    >
                      <thead>
                        <tr style={{ background: "#edf6ff" }}>
                          <th style={{ padding: "12px", borderBottom: "1px solid #d9e8ff", textAlign: "left" }}>ID</th>
                          <th style={{ padding: "12px", borderBottom: "1px solid #d9e8ff", textAlign: "left" }}>Destination</th>
                          <th style={{ padding: "12px", borderBottom: "1px solid #d9e8ff", textAlign: "left" }}>Start</th>
                          <th style={{ padding: "12px", borderBottom: "1px solid #d9e8ff", textAlign: "left" }}>End</th>
                          <th style={{ padding: "12px", borderBottom: "1px solid #d9e8ff", textAlign: "left" }}>Price</th>
                          <th style={{ padding: "12px", borderBottom: "1px solid #d9e8ff", textAlign: "left" }}>Likes</th>
                        </tr>
                      </thead>

                      <tbody>
                        {vacations.map((vacation) => (
                          <tr key={vacation.id}>
                            <td style={{ padding: "12px", borderBottom: "1px solid #f0f3f8" }}>{vacation.id}</td>
                            <td style={{ padding: "12px", borderBottom: "1px solid #f0f3f8", fontWeight: 600 }}>
                              {vacation.destination}
                            </td>
                            <td style={{ padding: "12px", borderBottom: "1px solid #f0f3f8" }}>
                              {formatDisplayDate(vacation.startDate)}
                            </td>
                            <td style={{ padding: "12px", borderBottom: "1px solid #f0f3f8" }}>
                              {formatDisplayDate(vacation.endDate)}
                            </td>
                            <td style={{ padding: "12px", borderBottom: "1px solid #f0f3f8", color: "#1f8f4e", fontWeight: 700 }}>
                              {vacation.price}
                            </td>
                            <td style={{ padding: "12px", borderBottom: "1px solid #f0f3f8", color: "#7b5ce0", fontWeight: 700 }}>
                              {vacation.likesCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}
          </div>
        </main>

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

export default ReportsPage;