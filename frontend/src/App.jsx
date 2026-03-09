import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Organisms from './pages/Organisms';
import DataViewer from './pages/DataViewer';
import RawDataViewer from './pages/RawDataViewer';
import About from './pages/About';
import Search from './pages/Search';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/organisms" element={<Organisms />} />
        <Route path="/organisms/:organism/:dataType" element={<DataViewer />} />
        <Route path="/raw-view" element={<RawDataViewer />} />
        <Route path="/about" element={<About />} />
        <Route path="/search" element={<Search />} />
      </Route>
    </Routes>
  );
}
