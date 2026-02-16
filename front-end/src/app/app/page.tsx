"use client"

import dynamic from "next/dynamic";

const DashboardContent = dynamic(() => import("./dashboard-content"), {
    ssr: false,
    loading: () => (
        <div className="flex min-h-[60vh] items-center justify-center">
            <p className="text-text-secondary">Loading dashboard...</p>
        </div>
    ),
});

export default function DashboardPage() {
    return <DashboardContent />;
}
