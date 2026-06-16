import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// AuthContext and route guards added in T013 / T015
// Pages added progressively per user story tasks

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* T016: <Route path="/login" element={<LoginPage />} /> */}
        {/* T031: <Route path="/hallazgos" element={<HallazgoListPage />} /> */}
        {/* Additional routes registered per task */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
