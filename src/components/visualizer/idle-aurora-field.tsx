"use client";

export default function IdleAuroraField() {
  return (
    <div className="idle-aurora">
      <div className="idle-aurora__core" />
      <div className="idle-aurora__halo" />
      <div className="idle-aurora__blob" />
      <div className="idle-aurora__blobSecondary" />
      <div className="idle-aurora__depth" />
      <div className="idle-aurora__streak" />
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

        .idle-aurora__core {
          position: absolute;
          left: 50%;
          top: 48%;
          width: min(20vw, 280px);
          height: min(14vw, 200px);
          transform: translate(-50%, -50%);
          background: radial-gradient(ellipse at center,
            rgba(210, 238, 255, 0.22),
            rgba(167, 139, 250, 0.12) 28%,
            rgba(120, 223, 255, 0.05) 56%,
            transparent 78%
          );
          filter: blur(18px);
          opacity: 0.55;
          animation: idleAuroraPulse 8s ease-in-out infinite;
        }

        .idle-aurora__halo {
          position: absolute;
          left: 50%;
          top: 48%;
          width: min(72vw, 980px);
          height: min(44vw, 620px);
          transform: translate(-50%, -50%);
          background: radial-gradient(ellipse at center,
            rgba(120, 223, 255, 0.08),
            rgba(167, 139, 250, 0.06) 36%,
            transparent 70%
          );
          filter: blur(56px);
          opacity: 0.38;
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
            radial-gradient(circle at 24% 36%, rgba(255, 214, 64, 0.62), transparent 26%),
            radial-gradient(circle at 42% 30%, rgba(120, 223, 255, 0.68), transparent 30%),
            radial-gradient(circle at 30% 62%, rgba(167, 139, 250, 0.68), transparent 28%),
            radial-gradient(circle at 62% 58%, rgba(255, 92, 138, 0.48), transparent 30%),
            radial-gradient(circle at 72% 42%, rgba(120, 255, 190, 0.34), transparent 34%);
          filter: blur(36px);
          opacity: 0.58;
          mix-blend-mode: screen;
          animation: idleAuroraMorph 24s ease-in-out infinite alternate;
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
            radial-gradient(circle at 32% 42%, rgba(120, 223, 255, 0.28), transparent 34%),
            radial-gradient(circle at 68% 52%, rgba(167, 139, 250, 0.32), transparent 38%),
            radial-gradient(circle at 48% 30%, rgba(216, 199, 161, 0.20), transparent 32%),
            radial-gradient(circle at 72% 62%, rgba(255, 92, 138, 0.14), transparent 28%);
          filter: blur(52px);
          opacity: 0.38;
          mix-blend-mode: screen;
          animation: idleAuroraDrift 26s ease-in-out infinite alternate;
        }

        .idle-aurora__depth {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(44vw, 600px);
          height: min(30vw, 400px);
          transform: translate(-50%, -50%);
          background: radial-gradient(ellipse at 42% 54%,
            transparent 18%,
            rgba(3, 4, 5, 0.12) 46%,
            transparent 68%
          );
          filter: blur(24px);
          opacity: 0.55;
          animation: idleAuroraShift 28s ease-in-out infinite alternate;
        }

        .idle-aurora__streak {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(34vw, 460px);
          height: min(6vw, 80px);
          transform: translate(-50%, -50%) rotate(-12deg);
          background: linear-gradient(90deg,
            transparent,
            rgba(255, 92, 138, 0.10),
            rgba(167, 139, 250, 0.14),
            transparent
          );
          filter: blur(20px);
          opacity: 0.30;
          animation: idleAuroraStreak 20s ease-in-out infinite alternate;
        }

        .idle-aurora__noise {
          position: absolute;
          inset: 0;
          opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 256px 256px;
          pointer-events: none;
          animation: idleAuroraNoise 90s linear infinite;
        }

        @keyframes idleAuroraPulse {
          0%, 100% {
            opacity: 0.40;
            transform: translate(-50%, -50%) scale(0.92);
          }
          50% {
            opacity: 0.68;
            transform: translate(-50%, -50%) scale(1.08);
          }
        }

        @keyframes idleAuroraMorph {
          0% {
            transform: translate(-50%, -50%) scale(0.94) rotate(-4deg);
            border-radius: 42% 58% 61% 39% / 45% 41% 59% 55%;
            opacity: 0.48;
          }
          50% {
            transform: translate(-49%, -53%) scale(1.06) rotate(3deg);
            border-radius: 55% 45% 43% 57% / 52% 62% 38% 48%;
            opacity: 0.66;
          }
          100% {
            transform: translate(-51%, -48%) scale(1.02) rotate(8deg);
            border-radius: 48% 52% 57% 43% / 39% 55% 45% 61%;
            opacity: 0.54;
          }
        }

        @keyframes idleAuroraBreathe {
          0%, 100% {
            opacity: 0.26;
            transform: translate(-50%, -50%) scale(0.92);
          }
          50% {
            opacity: 0.48;
            transform: translate(-50%, -50%) scale(1.06);
          }
        }

        @keyframes idleAuroraDrift {
          0% {
            transform: translate(-50%, -50%) scale(0.92) rotate(3deg);
            opacity: 0.22;
          }
          100% {
            transform: translate(-55%, -46%) scale(1.10) rotate(-7deg);
            opacity: 0.44;
          }
        }

        @keyframes idleAuroraShift {
          0% {
            transform: translate(-50%, -50%) scale(0.94);
            opacity: 0.40;
          }
          100% {
            transform: translate(-53%, -47%) scale(1.06);
            opacity: 0.60;
          }
        }

        @keyframes idleAuroraStreak {
          0% {
            transform: translate(-50%, -50%) rotate(-16deg) scaleX(0.88);
            opacity: 0.20;
          }
          100% {
            transform: translate(-50%, -50%) rotate(12deg) scaleX(1.12);
            opacity: 0.42;
          }
        }

        @keyframes idleAuroraNoise {
          0% { background-position: 0 0; }
          100% { background-position: 128px 128px; }
        }
      `}</style>
    </div>
  );
}
