import { Suspense, lazy, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { LoadingState } from "./components/states";
import DashboardPage from "./pages/DashboardPage";
import ScreenerPage from "./pages/ScreenerPage";
import MoneyFlowPage from "./pages/MoneyFlowPage";
import CorporateActionsPage from "./pages/CorporateActionsPage";
import NotFoundPage from "./pages/NotFoundPage";

// The chart library is heavy — load the stock page on demand.
const StockDetailPage = lazy(() => import("./pages/StockDetailPage"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="screener" element={<ScreenerPage />} />
          <Route
            path="stock/:ticker"
            element={
              <Suspense fallback={<LoadingState label="Loading stock…" />}>
                <StockDetailPage />
              </Suspense>
            }
          />
          <Route path="money-flow" element={<MoneyFlowPage />} />
          <Route path="corporate-actions" element={<CorporateActionsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}
