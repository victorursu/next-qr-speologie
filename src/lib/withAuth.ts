import type { GetServerSideProps } from "next";
import { getAuthFromRequest } from "./auth";

export const withAuth: GetServerSideProps = async (context) => {
  const authenticated = getAuthFromRequest(context.req);

  if (!authenticated) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  return { props: {} };
};
