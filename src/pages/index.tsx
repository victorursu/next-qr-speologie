import { GetServerSideProps } from "next";
import { getAuthFromRequest } from "@/lib/auth";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const authenticated = getAuthFromRequest(context.req);

  if (!authenticated) {
    return {
      redirect: { destination: "/login", permanent: false },
    };
  }

  return {
    redirect: { destination: "/qr", permanent: false },
  };
};

export default function Home() {
  return null;
}
