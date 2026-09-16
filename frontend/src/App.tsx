import { Navigate, Route, Routes } from "react-router-dom";
import { Splash } from "./pages/Splash";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { ParentHome } from "./pages/ParentHome";
import { ChildDashboard } from "./pages/ChildDashboard";
import { ParentLayout } from "./layouts/ParentLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PracticeTypeSelect } from "./pages/PracticeTypeSelect";
import { PracticeReady } from "./pages/PracticeReady";
import { LetterPracticeSetup } from "./pages/practice-setup/LetterPracticeSetup";
import { NumberPracticeSetup } from "./pages/practice-setup/NumberPracticeSetup";
import { MathPracticeSetup } from "./pages/practice-setup/MathPracticeSetup";
import { ShapePracticeSetup } from "./pages/practice-setup/ShapePracticeSetup";
import { MixedPracticeSetup } from "./pages/practice-setup/MixedPracticeSetup";
import { PracticeSummary } from "./pages/PracticeSummary";
import { KidLayout } from "./layouts/KidLayout";
import { KidPracticeSession } from "./pages/kid/KidPracticeSession";
import { ProgressDashboard } from "./pages/ProgressDashboard";
import { PracticeHistory } from "./pages/PracticeHistory";
import { AIPracticeGenerator } from "./pages/practice-setup/AIPracticeGenerator";
import { AITutor } from "./pages/AITutor";
import { Settings } from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        element={
          <ProtectedRoute>
            <ParentLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/home" element={<ParentHome />} />
        <Route path="/dashboard/:childId" element={<ChildDashboard />} />
        <Route path="/practice/create/:childId" element={<PracticeTypeSelect />} />
        <Route path="/practice/create/:childId/letters" element={<LetterPracticeSetup />} />
        <Route path="/practice/create/:childId/numbers" element={<NumberPracticeSetup />} />
        <Route path="/practice/create/:childId/math" element={<MathPracticeSetup />} />
        <Route path="/practice/create/:childId/shapes" element={<ShapePracticeSetup />} />
        <Route path="/practice/create/:childId/mixed" element={<MixedPracticeSetup />} />
        <Route path="/practice/create/:childId/ai" element={<AIPracticeGenerator />} />
        <Route path="/practice/:sessionId/ready" element={<PracticeReady />} />
        <Route path="/practice/:sessionId/summary" element={<PracticeSummary />} />
        <Route path="/progress" element={<ProgressDashboard />} />
        <Route path="/sessions" element={<PracticeHistory />} />
        <Route path="/ai-tutor" element={<AITutor />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <KidLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/kid/:childId/practice/:sessionId" element={<KidPracticeSession />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
