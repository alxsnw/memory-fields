"use client";

export default function IdleAuroraField() {
  return (
    <div className="idle-aurora">
      <div className="idle-aurora__core" />
      <div className="idle-aurora__blob" />
      <div className="idle-aurora__blob2" />
      <div className="idle-aurora__blob3" />
      <div className="idle-aurora__depth" />
      <div className="idle-aurora__band" />
      <div className="idle-aurora__halo" />
      <div className="idle-aurora__noise" />
      <div className="idle-aurora__shimmer" />

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
          width: min(12vw, 170px);
          height: min(8vw, 110px);
          transform: translate(-50%, -50%);
          background: radial-gradient(ellipse at 36% 42%,
            rgba(220, 240, 255, 0.36),
            rgba(167, 139, 250, 0.18) 22%,
            rgba(120, 223, 255, 0.08) 46%,
            transparent 68%
          );
          filter: blur(10px);
          opacity: 0.72;
          animation: idleAuroraCorePulse 12s ease-in-out infinite;
        }

        .idle-aurora__halo {
          position: absolute;
          left: 50%;
          top: 48%;
          width: min(80vw, 1100px);
          height: min(50vw, 680px);
          transform: translate(-50%, -50%);
          background: radial-gradient(ellipse at center,
            rgba(120, 223, 255, 0.06),
            rgba(167, 139, 250, 0.04) 30%,
            transparent 65%
          );
          filter: blur(64px);
          opacity: 0.32;
          animation: idleAuroraBreathe 16s ease-in-out infinite;
        }

        .idle-aurora__blob {
          position: absolute;
          left: 50%;
          top: 46%;
          width: min(48vw, 680px);
          height: min(30vw, 420px);
          transform: translate(-50%, -50%);
          border-radius: 40% 60% 55% 45% / 48% 38% 62% 52%;
          background:
            radial-gradient(circle at 20% 32%, rgba(255, 214, 64, 0.44), transparent 22%),
            radial-gradient(circle at 40% 26%, rgba(120, 223, 255, 0.52), transparent 26%),
            radial-gradient(circle at 28% 56%, rgba(167, 139, 250, 0.50), transparent 24%),
            radial-gradient(circle at 58% 54%, rgba(255, 92, 138, 0.34), transparent 28%),
            radial-gradient(circle at 68% 38%, rgba(120, 255, 190, 0.24), transparent 30%),
            radial-gradient(circle at 48% 42%, rgba(180, 220, 255, 0.12), transparent 34%);
          filter: blur(22px);
          opacity: 0.62;
          mix-blend-mode: screen;
          animation: idleAuroraMorph 28s ease-in-out infinite alternate;
        }

        .idle-aurora__blob2 {
          position: absolute;
          left: 56%;
          top: 52%;
          width: min(34vw, 480px);
          height: min(22vw, 300px);
          transform: translate(-50%, -50%);
          border-radius: 54% 46% 48% 52% / 46% 58% 42% 54%;
          background:
            radial-gradient(circle at 36% 40%, rgba(120, 223, 255, 0.22), transparent 28%),
            radial-gradient(circle at 64% 50%, rgba(167, 139, 250, 0.26), transparent 32%),
            radial-gradient(circle at 50% 60%, rgba(120, 255, 190, 0.12), transparent 26%),
            radial-gradient(circle at 44% 32%, rgba(216, 199, 161, 0.10), transparent 24%);
          filter: blur(28px);
          opacity: 0.38;
          mix-blend-mode: screen;
          animation: idleAuroraDrift2 30s ease-in-out infinite alternate;
        }

        .idle-aurora__blob3 {
          position: absolute;
          left: 44%;
          top: 54%;
          width: min(28vw, 380px);
          height: min(18vw, 240px);
          transform: translate(-50%, -50%);
          border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%;
          background:
            radial-gradient(circle at 50% 50%, rgba(120, 255, 190, 0.08), transparent 42%),
            radial-gradient(circle at 30% 60%, rgba(255, 92, 138, 0.06), transparent 38%);
          filter: blur(42px);
          opacity: 0.28;
          mix-blend-mode: screen;
          animation: idleAuroraDrift3 34s ease-in-out infinite alternate;
        }

        .idle-aurora__depth {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(50vw, 680px);
          height: min(36vw, 480px);
          transform: translate(-50%, -50%);
          background:
            radial-gradient(ellipse at 35% 48%, transparent 12%, rgba(3, 4, 5, 0.12) 32%, transparent 50%),
            radial-gradient(ellipse at 62% 52%, transparent 18%, rgba(3, 4, 5, 0.08) 40%, transparent 56%);
          filter: blur(16px);
          opacity: 0.62;
          animation: idleAuroraShift 32s ease-in-out infinite alternate;
        }

        .idle-aurora__band {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(44vw, 600px);
          height: min(10vw, 130px);
          transform: translate(-50%, -50%) rotate(-6deg);
          background: linear-gradient(90deg,
            transparent,
            rgba(167, 139, 250, 0.08) 18%,
            rgba(120, 223, 255, 0.05) 36%,
            rgba(255, 214, 64, 0.03) 54%,
            rgba(255, 92, 138, 0.05) 72%,
            transparent
          );
          filter: blur(14px);
          opacity: 0.42;
          animation: idleAuroraBand 36s ease-in-out infinite alternate;
        }

        .idle-aurora__noise {
          position: absolute;
          inset: 0;
          opacity: 0.045;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 256px 256px;
          pointer-events: none;
          animation: idleAuroraNoise 120s linear infinite;
        }

        .idle-aurora__shimmer {
          position: absolute;
          inset: 0;
          opacity: 0.018;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 128 128' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='s'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23s)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 128px 128px;
          pointer-events: none;
          animation: idleAuroraShimmer 80s linear infinite reverse;
        }

        @keyframes idleAuroraCorePulse {
          0%, 100% {
            opacity: 0.55;
            transform: translate(-50%, -50%) scale(0.88);
          }
          50% {
            opacity: 0.80;
            transform: translate(-50%, -50%) scale(1.05);
          }
        }

        @keyframes idleAuroraMorph {
          0% {
            transform: translate(-50%, -50%) scale(0.92) rotate(-5deg);
            border-radius: 40% 60% 55% 45% / 48% 38% 62% 52%;
            opacity: 0.50;
          }
          33% {
            transform: translate(-48%, -53%) scale(1.04) rotate(2deg);
            border-radius: 52% 48% 44% 56% / 50% 60% 40% 50%;
            opacity: 0.66;
          }
          66% {
            transform: translate(-52%, -47%) scale(1.02) rotate(6deg);
            border-radius: 46% 54% 60% 40% / 42% 52% 48% 58%;
            opacity: 0.58;
          }
          100% {
            transform: translate(-50%, -50%) scale(0.96) rotate(-2deg);
            border-radius: 50% 50% 52% 48% / 46% 44% 56% 54%;
            opacity: 0.52;
          }
        }

        @keyframes idleAuroraBreathe {
          0%, 100% {
            opacity: 0.22;
            transform: translate(-50%, -50%) scale(0.90);
          }
          50% {
            opacity: 0.40;
            transform: translate(-50%, -50%) scale(1.05);
          }
        }

        @keyframes idleAuroraDrift2 {
          0% {
            transform: translate(-50%, -50%) scale(0.88) rotate(4deg);
            opacity: 0.22;
          }
          100% {
            transform: translate(-53%, -48%) scale(1.08) rotate(-8deg);
            opacity: 0.44;
          }
        }

        @keyframes idleAuroraDrift3 {
          0% {
            transform: translate(-50%, -50%) scale(0.90);
            opacity: 0.18;
          }
          100% {
            transform: translate(-52%, -47%) scale(1.06);
            opacity: 0.36;
          }
        }

        @keyframes idleAuroraShift {
          0% {
            transform: translate(-50%, -50%) scale(0.92);
            opacity: 0.48;
          }
          100% {
            transform: translate(-53%, -47%) scale(1.06);
            opacity: 0.68;
          }
        }

        @keyframes idleAuroraBand {
          0% {
            transform: translate(-50%, -50%) rotate(-14deg) scaleX(0.86);
            opacity: 0.28;
          }
          100% {
            transform: translate(-50%, -50%) rotate(16deg) scaleX(1.14);
            opacity: 0.52;
          }
        }

        @keyframes idleAuroraNoise {
          0% { background-position: 0 0; }
          100% { background-position: 128px 128px; }
        }

        @keyframes idleAuroraShimmer {
          0% { background-position: 0 0; }
          100% { background-position: 64px -64px; }
        }
      `}</style>
    </div>
  );
}
