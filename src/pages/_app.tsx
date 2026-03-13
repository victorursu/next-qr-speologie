import "@/styles/globals.css";
import type { AppProps } from "next/app";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/map-bottom.png')",
          backgroundColor: "#e7e5e4",
        }}
        aria-hidden
      />
      <Component {...pageProps} />
    </>
  );
}
