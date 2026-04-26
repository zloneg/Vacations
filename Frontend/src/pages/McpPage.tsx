import { type FormEvent, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import api from "../services/api";
import "../App.css";

function cleanAnswerText(text: string): string {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter(
      (line) =>
        !/^image\s*name\s*:/i.test(line) &&
        !/^imagename\s*:/i.test(line)
    )
    .map((line) => line.replace(/^description\s*:\s*/i, ""))
    .map((line) => line.replace(/^startdate\s*:\s*/i, "Start date: "))
    .map((line) => line.replace(/^enddate\s*:\s*/i, "End date: "))
    .map((line) => line.replace(/^likescount\s*:\s*/i, "Likes: "))
    .map((line) => line.replace(/^destination\s*:\s*/i, "Destination: "))
    .join("\n");
}

function McpPage() {
  const navigate = useNavigate();
  const pdfRef = useRef<HTMLDivElement | null>(null);

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState("");

  const cleanedAnswer = cleanAnswerText(answer);

  const hasNoDatabaseResult =
    cleanedAnswer.toLowerCase().includes("not available in the vacations database");

  const canDownloadPdf = Boolean(cleanedAnswer.trim()) && !hasNoDatabaseResult;

  async function handleAsk(e: FormEvent) {
    e.preventDefault();

    if (!question.trim()) {
      setError("Please enter a question.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setAnswer("");

      const response = await api.post("/mcp/ask", {
        question: question.trim()
      });

      setAnswer(response.data.answer || "No answer was generated.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to get answer.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!pdfRef.current || !canDownloadPdf) return;

    try {
      setDownloadingPdf(true);

      const canvas = await html2canvas(pdfRef.current, {
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

      pdf.save("travel-qa-answer.pdf");
    } catch (err) {
      console.error(err);
      setError("Failed to download PDF.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  function clearForm() {
    setQuestion("");
    setAnswer("");
    setError("");
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <>
      <style>{`
        @keyframes flyingPlane {
          0% {
            transform: translateX(-18px) translateY(0) rotate(-10deg);
            opacity: 0.7;
          }
          25% {
            transform: translateX(0px) translateY(-6px) rotate(-4deg);
            opacity: 1;
          }
          50% {
            transform: translateX(18px) translateY(0px) rotate(0deg);
            opacity: 1;
          }
          75% {
            transform: translateX(0px) translateY(6px) rotate(4deg);
            opacity: 1;
          }
          100% {
            transform: translateX(-18px) translateY(0) rotate(-10deg);
            opacity: 0.7;
          }
        }

        .mcp-loading-plane {
          display: inline-block;
          font-size: 30px;
          animation: flyingPlane 1.7s ease-in-out infinite;
        }
      `}</style>

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
                maxWidth: "900px",
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
                Travel Q&amp;A
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
                Ask anything about the vacations in our database and get a clear answer.
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "24px"
                }}
              >
                <div
                  style={{
                    width: "140px",
                    height: "140px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(180deg, #f5fbff 0%, #e9f4ff 100%)",
                    border: "1px solid #d8ebff",
                    boxShadow: "0 8px 22px rgba(47, 126, 219, 0.14)"
                  }}
                >
                  <span
                    style={{
                      fontSize: "78px",
                      lineHeight: 1
                    }}
                  >
                    🤖
                  </span>
                </div>
              </div>

              <form onSubmit={handleAsk}>
                <label
                  htmlFor="mcp-question"
                  style={{
                    display: "block",
                    fontWeight: 700,
                    marginBottom: "10px",
                    color: "#555",
                    textAlign: "center",
                    fontSize: "18px"
                  }}
                >
                  Your question
                </label>

                <textarea
                  id="mcp-question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Example: Looking for vacations in Spain or France"
                  rows={5}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "14px",
                    border: "1px solid #bbb",
                    fontSize: "16px",
                    marginBottom: "18px",
                    boxSizing: "border-box",
                    resize: "vertical"
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "12px",
                    flexWrap: "wrap"
                  }}
                >
                  <button type="submit" className="top-action-btn" disabled={loading}>
                    {loading ? "Loading..." : "Ask"}
                  </button>

                  <button
                    type="button"
                    onClick={clearForm}
                    className="logout-btn"
                    disabled={loading}
                  >
                    Clear
                  </button>
                </div>
              </form>

              {loading && (
                <div
                  style={{
                    marginTop: "20px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    color: "#4c4c66",
                    fontWeight: 600
                  }}
                >
                  <span className="mcp-loading-plane">✈</span>
                  <span>Searching travel data...</span>
                </div>
              )}

              {error && (
                <p
                  style={{
                    color: "red",
                    textAlign: "center",
                    marginTop: "20px",
                    fontWeight: 500
                  }}
                >
                  {error}
                </p>
              )}

              {cleanedAnswer && (
                <div ref={pdfRef}>
                  <section
                    style={{
                      marginTop: "28px",
                      padding: "22px",
                      borderRadius: "18px",
                      border: "1px solid #d9e8ff",
                      background: "#f8fbff"
                    }}
                  >
                    <h2
                      style={{
                        margin: "0 0 18px",
                        fontSize: "34px",
                        textAlign: "center"
                      }}
                    >
                      Answer
                    </h2>

                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.8,
                        fontSize: "17px",
                        color: "#333",
                        textAlign: "center"
                      }}
                    >
                      {cleanedAnswer}
                    </div>
                  </section>
                </div>
              )}

              {cleanedAnswer && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginTop: "18px"
                  }}
                >
                  {canDownloadPdf && (
                    <button
                      type="button"
                      className="top-action-btn"
                      onClick={handleDownloadPdf}
                      disabled={downloadingPdf}
                    >
                      {downloadingPdf ? "Downloading PDF..." : "Download Answer PDF"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="logout-btn"
                    onClick={() => navigate("/vacations")}
                  >
                    Open Vacation Cards
                  </button>
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
    </>
  );
}

export default McpPage;