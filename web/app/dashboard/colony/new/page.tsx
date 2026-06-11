"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authFetch, getStoredUser } from "../../../utils";
import { Apiary } from "../../../types";

export default function NewColonyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiaries, setApiaries] = useState<Apiary[]>([]);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    code: "",
    apiary_id: "",
    status: "Active",
    queen_tag: "",
    mother_colony_id: ""
  });

  // Guard & Load User/Apiaries
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      window.location.href = "/";
      return;
    }
    if (stored.role === "guest") {
      alert("게스트는 봉군을 등록할 수 없습니다.");
      router.push("/");
      return;
    }
    setUser(stored);

    const loadData = async () => {
      try {
        const res = await authFetch("/api/v1/apiaries");
        if (res.ok) {
          const apiaryData = await res.json();
          setApiaries(apiaryData);

          // If there's an apiary_id in localStorage fallback (e.g. they clicked from an apiary's management panel)
          const lastApiaryId = localStorage.getItem("melitta_last_apiary_id");
          if (lastApiaryId) {
            setForm((f) => ({ ...f, apiary_id: lastApiaryId }));
            localStorage.removeItem("melitta_last_apiary_id");
          }
        }
      } catch (err) {
        console.error("Failed to load apiaries list", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const allColonies = apiaries.flatMap((a) => a.colonies);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.apiary_id) {
      alert("봉군을 속할 양봉장을 선택해주세요.");
      return;
    }

    setBusy(true);
    try {
      const body = {
        code: form.code || null,
        apiary_id: parseInt(form.apiary_id),
        status: form.status,
        queen_tag: form.queen_tag || "Unknown",
        mother_colony_id: form.mother_colony_id ? parseInt(form.mother_colony_id) : null,
      };

      const res = await authFetch("/api/v1/colonies", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        let errorMsg = "봉군 생성에 실패했습니다.";
        if (errorData && errorData.detail) {
          if (typeof errorData.detail === "string") {
            errorMsg = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            errorMsg = errorData.detail.map((err: any) => `${err.loc?.join(".") || "error"}: ${err.msg}`).join("\n");
          } else if (typeof errorData.detail === "object") {
            errorMsg = JSON.stringify(errorData.detail);
          }
        }
        alert(errorMsg);
        return;
      }

      // Sync state and trigger dashboard list refetch
      localStorage.setItem("melitta_dashboard_view", "colonies");
      localStorage.setItem("melitta_refetch_trigger", "true");
      alert("💾 봉군이 정상적으로 등록되었습니다!");
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
          <span className="text-2xl">🐝</span> K-BEE BANK
        </div>
        <h1 className="text-lg font-bold text-slate-800">🐝 신규 봉군 등록</h1>
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
            <h2 className="text-xl font-bold text-slate-900">📝 벌통 정보 입력</h2>
            <p className="text-xs text-slate-500 mt-1">소속될 봉장 정보와 모계 계통, 여왕벌 식별 정보를 설정해 주세요.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600">봉군 코드</label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="공백으로 두면 표준 규칙에 따라 자동 생성"
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition"
            />
            <span className="text-[11px] text-amber-600 font-medium">
              💡 예: C-GG-MEL-26-01-01 (지역-농가-연도-봉장-순번)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">소속 양봉장 선택 *</label>
              <select
                value={form.apiary_id}
                onChange={(e) => setForm({ ...form, apiary_id: e.target.value })}
                required
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer focus:border-amber-500 focus:bg-white transition font-medium"
              >
                <option value="">양봉장 선택...</option>
                {apiaries.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.location || "위치 미지정"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-600">초기 상태</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer focus:border-amber-500 focus:bg-white transition"
              >
                <option value="Active">Active (활성)</option>
                <option value="Weak">Weak (약세)</option>
                <option value="Dead">Dead (폐사)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600">여왕벌 품종 지정 / 직접 태그 입력</label>
            <div className="flex flex-col gap-3">
              <select
                value={form.queen_tag}
                onChange={(e) => setForm({ ...form, queen_tag: e.target.value })}
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer focus:border-amber-500 focus:bg-white transition"
              >
                <option value="">기본 자동 생성 (이탈리안 계열)</option>
                <option value="이탈리안">이탈리안 (Italian)</option>
                <option value="카니올란">카니올란 (Carniolan)</option>
                <option value="코카시안">코카시안 (Caucasian)</option>
                <option value="한봉">한봉 (Korean Native)</option>
                <option value="기타">기타 혼합 (Hybrid)</option>
              </select>
              <input
                type="text"
                value={form.queen_tag}
                onChange={(e) => setForm({ ...form, queen_tag: e.target.value })}
                placeholder="직접 태그 입력도 가능 (예: Q-2026-N03)"
                className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>
            <span className="text-[11px] text-amber-600 font-medium mt-1">
              💡 미입력 또는 품종 선택 시 Q-IT-GG-26-MEL-01 형태로 자동 명명됩니다.
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-600">모계 벌통 선택 (Parent Lineage)</label>
            <select
              value={form.mother_colony_id}
              onChange={(e) => setForm({ ...form, mother_colony_id: e.target.value })}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer focus:border-amber-500 focus:bg-white transition"
            >
              <option value="">모계 선택 안함 (신규 수집 계통)</option>
              {allColonies.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.code} (여왕벌: {parent.queen_tag})
                </option>
              ))}
            </select>
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
              {busy ? "저장 중..." : "💾 봉군 저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
