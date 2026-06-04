"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authFetch, getStoredUser } from "../../../utils";

export default function NewApiaryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: "",
    owner: "",
    location: "",
    latitude: "",
    longitude: "",
    owner_id: ""
  });

  // Guard & Load User Details
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      window.location.href = "/";
      return;
    }
    if (stored.role === "guest") {
      alert("게스트는 양봉장을 등록할 수 없습니다.");
      router.push("/");
      return;
    }
    setUser(stored);

    // If researcher or admin, load farmers list
    if (stored.role === "researcher" || stored.role === "admin") {
      const loadFarmers = async () => {
        try {
          const res = await authFetch("/api/v1/researcher/farmers");
          if (res.ok) {
            setFarmers(await res.json());
          }
        } catch (err) {
          console.error("Failed to load farmers registry", err);
        } finally {
          setLoading(false);
        }
      };
      loadFarmers();
    } else {
      setLoading(false);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        name: form.name,
        owner: form.owner || null,
        location: form.location || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
        owner_id:
          (user.role === "researcher" || user.role === "admin") && form.owner_id
            ? parseInt(form.owner_id)
            : null,
      };

      const res = await authFetch("/api/v1/apiaries", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.detail || "양봉장 생성에 실패했습니다.");
        return;
      }

      // Sync state and trigger dashboard list refetch
      localStorage.setItem("melitta_dashboard_view", "apiaries");
      localStorage.setItem("melitta_refetch_trigger", "true");
      alert("💾 양봉장이 정상적으로 등록되었습니다!");
      router.push("/");
    } catch (err: any) {
      alert(err.message || "서버 통신 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-slate-800 font-sans pb-12">
      <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 px-8 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 text-xl font-bold text-slate-900 cursor-pointer" onClick={() => router.push("/")}>
          <span className="text-2xl">🐝</span> MelittaBreed
        </div>
        <h1 className="text-lg font-bold text-slate-800">🏡 신규 양봉장 등록</h1>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-sm font-semibold flex items-center gap-1.5"
        >
          🏠 대시보드로 돌아가기
        </button>
      </header>

      <div className="max-w-3xl mx-auto mt-10 px-4">
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col gap-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">📝 양봉장 정보 입력</h2>
            <p className="text-xs text-slate-500 mt-1">새로운 양봉장의 명칭, 위치, 소유 농가를 설정해 주세요.</p>
          </div>

          {(user?.role === "researcher" || user?.role === "admin") && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">소유 농가 지정 *</label>
              <select
                value={form.owner_id}
                onChange={(e) => setForm({ ...form, owner_id: e.target.value })}
                required
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition cursor-pointer"
              >
                <option value="">농가 선택...</option>
                {farmers.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.farm_name} ({f.username})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">양봉장 이름 *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="예: 남한산성 연구 봉장"
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">관리자 이름</label>
              <input
                type="text"
                value={form.owner}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
                placeholder="예: 홍길동"
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600">양봉장 위치 (주소)</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="예: 경기도 광주시 남한산성면"
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">위도 (GPS Latitude)</label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                placeholder="예: 37.4782"
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">경도 (GPS Longitude)</label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                placeholder="예: 127.1895"
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="flex gap-4 border-t border-slate-100 pt-6">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="flex-1 py-3 px-6 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-2 py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
            >
              {busy ? "저장 중..." : "💾 양봉장 저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
