import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ReferralForm from "@/components/ReferralForm";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ReferralForm />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;