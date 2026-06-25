/**
 * Dashboard skeleton — shown while getPetView resolves (mostly during the
 * Aurora round-trip on a fresh navigation). Mirrors the dashboard's hero +
 * card rhythm so the layout doesn't jump when real data lands.
 *
 * Non-clinical: every placeholder is a neutral shape — no scores, no bands,
 * no narrative copy. Nothing here passes through the guardrail because nothing
 * here is narration.
 */
const SKELETON_BAR_BG = "linear-gradient(90deg, rgba(0,0,0,0.04), rgba(0,0,0,0.08), rgba(0,0,0,0.04))";

function Bar({ w = "100%", h = 12, mt = 0 }: { w?: number | string; h?: number; mt?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        width: w, height: h, marginTop: mt, borderRadius: 999,
        background: SKELETON_BAR_BG,
        backgroundSize: "200% 100%",
        animation: "gv-rise 1.2s ease-in-out infinite",
      }}
    />
  );
}

function Card({ children, h }: { children?: React.ReactNode; h?: number }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--hairline)", borderRadius: 18, padding: 18, minHeight: h }}>
      {children}
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      aria-label="Loading dashboard"
      style={{ width: "100%", maxWidth: 440, margin: "0 auto", padding: "24px 16px 28px", display: "flex", flexDirection: "column", gap: 14 }}
    >
      {/* hero skeleton */}
      <div style={{ background: "linear-gradient(120deg, #4f8a7d 0%, #4a8076 45%, #54748f 100%)", borderRadius: 20, padding: 20, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, background: "rgba(255,255,255,0.25)" }} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <Bar w={140} h={16} />
            <Bar w={100} h={11} mt={8} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <Bar w="32%" h={32} />
          <Bar w="32%" h={32} />
          <Bar w="32%" h={32} />
        </div>
      </div>

      <Card h={140}>
        <Bar w={120} h={11} />
        <Bar w="100%" h={56} mt={12} />
        <Bar w="60%" h={11} mt={12} />
      </Card>

      <Card h={92}>
        <Bar w={100} h={11} />
        <Bar w="80%" h={14} mt={10} />
        <Bar w="40%" h={11} mt={10} />
      </Card>

      <Card h={120}>
        <Bar w={120} h={11} />
        <Bar w="100%" h={14} mt={12} />
        <Bar w="100%" h={14} mt={8} />
        <Bar w="80%" h={14} mt={8} />
      </Card>
    </main>
  );
}
