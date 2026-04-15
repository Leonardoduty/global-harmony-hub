import { usePath } from "@/lib/router";
import Layout from "@/routes/__root";
import IndexPage from "@/routes/index";
import ConflictMapPage from "@/routes/conflict-map";
import NewsShieldPage from "@/routes/news-shield";
import SituationRoomPage from "@/routes/situation-room";
import PresidentialSimPage from "@/routes/presidential-sim";

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const path = usePath();

  let Page: React.ComponentType;
  if (path === "/" || path === "") {
    Page = IndexPage;
  } else if (path === "/conflict-map") {
    Page = ConflictMapPage;
  } else if (path === "/news-shield") {
    Page = NewsShieldPage;
  } else if (path === "/situation-room") {
    Page = SituationRoomPage;
  } else if (path === "/presidential-sim") {
    Page = PresidentialSimPage;
  } else {
    Page = NotFound;
  }

  return (
    <Layout>
      <Page />
    </Layout>
  );
}
