"use client";

export default function IdleAuroraField() {
  return (
    <div className="idle-aurora">
      <div className="idle-aurora__halo" />
      <div className="idle-aurora__blob" />
      <div className="idle-aurora__blobSecondary" />
      <div className="idle-aurora__noise" />

      <style>{`
        .idle-aurora {
          position: fixed;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
          background: #030405;
          z-index: 0;
        }

        .idle-aurora__halo {
          position: absolute;
          left: 50%;
          top: 48%;
          width: min(72vw, 980px);
          height: min(44vw, 620px);
          transform: translate(-50%, -50%);
          background: radial-gradient(ellipse at center,
            rgba(120, 223, 255, 0.12),
            rgba(167, 139, 250, 0.08) 36%,
            transparent 72%
          );
          filter: blur(72px);
          opacity: 0.48;
          animation: idleAuroraBreathe 14s ease-in-out infinite;
        }

        .idle-aurora__blob {
          position: absolute;
          left: 50%;
          top: 45%;
          width: min(54vw, 760px);
          height: min(34vw, 470px);
          transform: translate(-50%, -50%);
          border-radius: 42% 58% 61% 39% / 45% 41% 59% 55%;
          background:
            radial-gradient(circle at 24% 36%, rgba(255, 214, 64, 0.72), transparent 26%),
            radial-gradient(circle at 42% 30%, rgba(120, 223, 255, 0.64), transparent 30%),
            radial-gradient(circle at 30% 62%, rgba(167, 139, 250, 0.64), transparent 28%),
            radial-gradient(circle at 62% 58%, rgba(255, 92, 138, 0.58), transparent 30%),
            radial-gradient(circle at 72% 42%, rgba(120, 255, 190, 0.42), transparent 34%);
          filter: blur(46px);
          opacity: 0.54;
          mix-blend-mode: screen;
          animation: idleAuroraMorph 18s ease-in-out infinite alternate;
        }

        .idle-aurora__blobSecondary {
          position: absolute;
          left: 57%;
          top: 53%;
          width: min(38vw, 520px);
          height: min(24vw, 340px);
          transform: translate(-50%, -50%);
          border-radius: 58% 42% 49% 51% / 50% 61% 39% 50%;
          background:
            radial-gradient(circle at 35% 45%, rgba(120, 223, 255, 0.34), transparent 34%),
            radial-gradient(circle at 65% 55%, rgba(167, 139, 250, 0.38), transparent 38%),
            radial-gradient(circle at 52% 35%, rgba(216, 199, 161, 0.24), transparent 32%);
          filter: blur(64px);
          opacity: 0.42;
          mix-blend-mode: screen;
          animation: idleAuroraDrift 22s ease-in-out infinite alternate;
        }

        .idle-aurora__noise {
          position: absolute;
          inset: 0;
          opacity: 0.035;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 256px 256px;
          pointer-events: none;
        }

        @keyframes idleAuroraMorph {
          0% {
            transform: translate(-50%, -50%) scale(0.96) rotate(-4deg);
            border-radius: 42% 58% 61% 39% / 45% 41% 59% 55%;
            opacity: 0.46;
          }
          50% {
            transform: translate(-49%, -52%) scale(1.04) rotate(3deg);
            border-radius: 55% 45% 43% 57% / 52% 62% 38% 48%;
            opacity: 0.62;
          }
          100% {
            transform: translate(-51%, -48%) scale(1.0) rotate(7deg);
            border-radius: 48% 52% 57% 43% / 39% 55% 45% 61%;
            opacity: 0.52;
          }
        }

        @keyframes idleAuroraBreathe {
          0%, 100% {
            opacity: 0.32;
            transform: translate(-50%, -50%) scale(0.94);
          }
          50% {
            opacity: 0.56;
            transform: translate(-50%, -50%) scale(1.07);
          }
        }

        @keyframes idleAuroraDrift {
          0% {
            transform: translate(-50%, -50%) scale(0.94) rotate(2deg);
            opacity: 0.28;
          }
          100% {
            transform: translate(-54%, -47%) scale(1.08) rotate(-6deg);
            opacity: 0.48;
          }
        }
      `}</style>
    </div>
  );
}
