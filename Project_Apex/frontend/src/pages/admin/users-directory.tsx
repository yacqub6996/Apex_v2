import { Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UsersList } from "@/components/dashboard/users-list";
import { UsersService } from "@/api/services/UsersService";
import { AdminDashboardLayout } from "@/components/admin/admin-dashboard-layout";
import type { UserPublic } from "@/api/models/UserPublic";
import { ApiError } from "@/api/core/ApiError";
import { toast } from "@/providers/enhanced-toast-provider";
import { useAuth } from "@/providers/auth-provider";
import { useState } from "react";
import { KycInspectModal } from "@/components/admin/kyc-inspect-modal";
import { Panel } from "@/components/shared";

export const UsersDirectory = () => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserPublic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["admin-users-count"],
    queryFn: () => UsersService.usersReadUsers(0, 100),
  });
  const count = usersQuery.data?.data?.length ?? 0;

  const handleRequestDelete = (user: UserPublic) => {
    if (currentUser && user.id === currentUser.id) {
      toast.error("You cannot delete your own admin account.");
      return;
    }
    setUserToDelete(user);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await UsersService.usersDeleteUser(userToDelete.id);
      toast.success("User deleted successfully");
      setUserToDelete(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-users-count"] });
    } catch (error: unknown) {
      let message = "Failed to delete user";
      if (error instanceof ApiError) {
        const body = error.body as Record<string, unknown>;
        message = (body?.detail as string) ?? error.message ?? message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteDialog = () => {
    if (isDeleting) return;
    setUserToDelete(null);
  };

  return (
    <AdminDashboardLayout title="Users" subtitle="Directory of all users">
      <Stack spacing={2}>
        <Panel 
          title="User directory" 
          actions={<Chip label={`${count} users`} size="small" color="primary" />}
        >
          <UsersList
            onInspectKyc={(u) => setInspectUserId(u.id)}
            onDeleteUser={handleRequestDelete}
          />
        </Panel>
        <KycInspectModal open={!!inspectUserId} userId={inspectUserId ?? undefined} onClose={() => setInspectUserId(null)} />
        <Dialog open={!!userToDelete} onClose={handleCloseDeleteDialog}>
          <DialogTitle>Delete user?</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {userToDelete
                ? `This will permanently delete ${userToDelete.email}. This action cannot be undone.`
                : ""}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </AdminDashboardLayout>
  );
};
