import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '../features/home/HomePage';
import { QueuePage } from '../features/queue/QueuePage';
import { StaffPage } from '../features/staff/StaffPage';
import { ToastProvider } from '../shared/components/ToastProvider';

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join/:code" element={<QueuePage />} />
        <Route path="/staff" element={<StaffPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
