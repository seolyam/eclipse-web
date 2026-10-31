import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="lost">
      <Image src="/assets/img/logo-320.webp" width={56} height={56} alt="Eclipse" unoptimized />
      <h1>Page not found</h1>
      <p>This page does not exist. Everything Eclipse has starts from the home page or the Wardrobe.</p>
      <div className="cta">
        <Link className="btn btn--primary" href="/">Back to Eclipse</Link>
        <Link className="btn btn--ghost" href="/wardrobe">Go to the Wardrobe</Link>
      </div>
    </main>
  );
}
