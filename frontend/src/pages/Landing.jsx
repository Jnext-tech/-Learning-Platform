import { Link } from "react-router-dom";
import quranLogo from "../assets/logo.png";
function QuranMark({ compact = false, decorative = false, alt = "شعار المركز" }) {
  const imgAlt = decorative ? "" : alt;
  return (
    <div className={`quran-mark ${compact ? "quran-mark--compact" : ""}`} aria-hidden={decorative}>
      <img className="quran-mark__img" src={quranLogo} alt={imgAlt} />
    </div>
  );
}

export default function Landing() {
  return (
    <div className="landing" dir="rtl">
      <header className="landing-nav">
        <Link className="landing-brand" to="/" aria-label="الفرقان - الصفحة الرئيسية">
          <QuranMark compact decorative />
          <span><strong>الفرقان</strong><small>مركز الفرقان لتحفيظ القرآن الكريم</small></span>
        </Link>
        <nav aria-label="التنقل الرئيسي">
          <a href="#home">الرئيسية</a>
          <a href="#about">عن المركز</a>
          <a href="#contact">تواصل معنا</a>
        </nav>
        <Link className="landing-login landing-login--nav" to="/login">تسجيل الدخول</Link>
      </header>

      <main id="home" className="landing-hero">
        <div className="landing-art"><QuranMark /></div>
        <section className="landing-copy" aria-labelledby="welcome-title">
          <p className="landing-kicker">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
          <h1 id="welcome-title">مرحباً بك في منصة<br />الفرقان التعليمية</h1>
          <p className="landing-lead">رحلتك لحفظ كتاب الله ومراجعته بسهولة وإتقان</p>
          <p id="about" className="landing-description">منصة متكاملة لإدارة حلقات تحفيظ القرآن الكريم، توفر لك تجربة تعليمية موحّدة تجمع بين الحلقات المباشرة والمتابعة والحضور والاختبارات وتقارير التقدم في مكان واحد.</p>
          <Link className="landing-login landing-login--cta" to="/login">تسجيل الدخول <span aria-hidden="true">←</span></Link>
        </section>
      </main>
      <footer id="contact" className="landing-footer">الفرقان التعليمية · نرتقي بحفظ كتاب الله</footer>
    </div>
  );
}
