"use client";

import { WorkspaceProvider, useWorkspace } from "../components/workspace-provider";
import { LoginScreen } from "../components/login-screen";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

function RootGate() {
  const { token, currentUser } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (token && currentUser) {
      router.replace(currentUser.scope === "platform" ? "/admin" : "/panel");
    }
  }, [token, currentUser, router]);

  return <LoginScreen />;
}

export default function Home() {
  return (
    <WorkspaceProvider>
      <RootGate />
    </WorkspaceProvider>
  );
}
