import { Chip, Stack } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { UsersList } from "@/components/dashboard/users-list";
import { UsersService } from "@/api/services/UsersService";
import { AdminDashboardLayout } from "@/components/admin/admin-dashboard-layout";
import { useState } from "react";
import { KycInspectModal } from "@/components/admin/kyc-inspect-modal";
import { Panel } from "@/components/shared";

export const UsersDirectory = () => {
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  const usersQuery = useQuery({
    queryKey: ["admin-users-count"],
    queryFn: () => UsersService.usersReadUsers(0, 100),
  });
  const count = usersQuery.data?.data?.length ?? 0;

  return (
    <AdminDashboardLayout title="Users" subtitle="Directory of all users">
      <Stack spacing={2}>
        <Panel 
          title="User directory" 
          actions={<Chip label={`${count} users`} size="small" color="primary" />}
        >
          <UsersList onInspectKyc={(u) => setInspectUserId(u.id)} />
        </Panel>
        <KycInspectModal open={!!inspectUserId} userId={inspectUserId ?? undefined} onClose={() => setInspectUserId(null)} />
      </Stack>
    </AdminDashboardLayout>
  );
};
