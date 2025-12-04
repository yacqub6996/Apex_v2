import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Box, Button, Chip, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography, Checkbox, FormControlLabel, Snackbar, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import DownloadIcon from '@mui/icons-material/Download';
import ZoomPan from '@/components/admin/kyc/ZoomPan';
import { KycService } from '@/api/services/KycService';
import type { KycApplicationDetail } from '@/api/models/KycApplicationDetail';
import type { KycRejectionPayload } from '@/api/models/KycRejectionPayload';
import { toAbsoluteResource } from '@/utils/url';

const formatDateTime = (value?: string | null) =>
  value ? new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'N/A';

export const KycReviewDetail = () => {
  const { userId } = useParams({ from: '/admin/kyc-review/$userId' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const detail = useQuery<KycApplicationDetail>({
    queryKey: ['admin-kyc-detail', userId],
    queryFn: () => KycService.kycGetApplicationDetail(userId),
  });

  const [selectedDocs, setSelectedDocs] = React.useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogImages, setDialogImages] = React.useState<{ title: string; srcs: string[] } | null>(null);
  const [toast, setToast] = React.useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const [qualityMap, setQualityMap] = React.useState<Record<string, 'Poor' | 'Fair' | 'Good'>>({});

  const rateQuality = (w: number, h: number): 'Poor' | 'Fair' | 'Good' => {
    const px = Math.max(w, h);
    if (px >= 1600) return 'Good';
    if (px >= 900) return 'Fair';
    return 'Poor';
  };
  const onImgLoad = (key: string) => (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const q = rateQuality(img.naturalWidth, img.naturalHeight);
    setQualityMap((m) => ({ ...m, [key]: q }));
  };

  const approveKYC = useMutation({
    mutationFn: () => KycService.kycApproveApplication(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-detail', userId] });
      navigate({ to: '/admin/kyc-review' });
    },
  });

  const rejectKYC = useMutation({
    mutationFn: (payload: KycRejectionPayload) => KycService.kycRejectApplication(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-kyc'] });
      queryClient.invalidateQueries({ queryKey: ['admin-kyc-detail', userId] });
      navigate({ to: '/admin/kyc-review' });
    },
  });

  const onReject = async () => {
    const reason = window.prompt('Enter rejection reason:', 'Documents incomplete');
    if (reason) rejectKYC.mutate({ reason });
  };

  const toggleDocSelected = (docId: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const openViewer = (title: string, srcs: string[]) => {
    setDialogImages({ title, srcs });
    setDialogOpen(true);
  };

  const bulkDownload = async () => {
    try {
      const ids = Array.from(selectedDocs).join(',');
      const backendUrl = toAbsoluteResource(`/api/v1/kyc/applications/${userId}/documents/bulk-download?ids=${encodeURIComponent(ids)}`);
      const resp = await fetch(backendUrl || '', {
        method: 'GET',
        headers: { 'Accept': 'application/zip' },
        credentials: 'include',
      });
      if (!resp.ok) throw new Error('Failed to download');
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kyc_documents_${userId}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setToast({ open: true, message: 'Download started', severity: 'success' });
    } catch (e) {
      setToast({ open: true, message: 'Bulk download failed', severity: 'error' });
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack 
        direction={{ xs: 'column', sm: 'row' }} 
        spacing={2} 
        justifyContent="space-between" 
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={600}>KYC Review</Typography>
          <Typography variant="body2" color="text.secondary">Inspect documents and decide.</Typography>
        </Box>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }} 
          spacing={1}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          <Button variant="outlined" onClick={() => navigate({ to: '/admin/kyc-review' })} sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }}>Back</Button>
          <Button variant="contained" color="error" onClick={onReject} disabled={rejectKYC.isPending || approveKYC.isPending} sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }}>Reject</Button>
          <Button variant="contained" onClick={() => approveKYC.mutate()} disabled={approveKYC.isPending || rejectKYC.isPending} sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }}>Approve</Button>
        </Stack>
      </Stack>

      {detail.isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 160 }}>
          <CircularProgress size={20} />
        </Box>
      ) : detail.isError || !detail.data ? (
        <Typography variant="body2" color="text.secondary">Unable to load KYC details.</Typography>
      ) : (
        <Stack spacing={4}>
          <Box>
            <Typography variant="subtitle2" color="text.secondary">User</Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Typography variant="body2" fontWeight={600}>{detail.data.user.full_name ?? detail.data.user.email}</Typography>
              <Typography variant="body2" color="text.secondary">• {detail.data.user.email}</Typography>
              {detail.data.user.kyc_status && <Chip size="small" sx={{ textTransform: 'capitalize' }} label={String(detail.data.user.kyc_status)} />}
            </Stack>
          </Box>

          {detail.data.profile && (
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Profile</Typography>
              <Box 
                sx={{ 
                  mt: 0.5, 
                  display: 'grid', 
                  gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, 
                  gap: 2 
                }}
              >
                {detail.data.profile.phone_number && <Typography variant="body2">Phone: {detail.data.profile.phone_number}</Typography>}
                {detail.data.profile.country && <Typography variant="body2">Country: {detail.data.profile.country}</Typography>}
                {detail.data.profile.date_of_birth && <Typography variant="body2">DOB: {detail.data.profile.date_of_birth}</Typography>}
              </Box>
            </Box>
          )}

          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Documents</Typography>
            {detail.data.documents.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No documents uploaded.</Typography>
            ) : (
              <Stack spacing={2}>
                {/* Bulk actions bar */}
                {selectedDocs.size > 0 && (
                  <Stack 
                    direction={{ xs: 'column', sm: 'row' }} 
                    spacing={2} 
                    justifyContent="space-between" 
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    sx={{ p: 1.5, borderRadius: 2, border: 1, borderColor: 'divider' }}
                  >
                    <Typography variant="body2">{selectedDocs.size} selected</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button startIcon={<DownloadIcon />} size="small" variant="outlined" onClick={bulkDownload} sx={{ minHeight: 44 }}>Bulk Download</Button>
                      <Button size="small" onClick={() => setSelectedDocs(new Set())} sx={{ minHeight: 44 }}>Clear</Button>
                    </Stack>
                  </Stack>
                )}

                {detail.data.documents.map((doc) => (
                  <Box key={doc.id} sx={{ borderRadius: 3, border: 1, borderColor: 'divider', p: 2 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1} sx={{ mb: 2 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <FormControlLabel control={<Checkbox checked={selectedDocs.has(doc.id)} onChange={() => toggleDocSelected(doc.id)} />} label="" />
                        <Typography variant="body1" fontWeight={600} sx={{ textTransform: 'capitalize' }}>{doc.document_type.replace(/_/g, ' ')}</Typography>
                        {doc.verified ? <Chip size="small" color="success" label="Verified" /> : <Chip size="small" label="Unverified" />}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">Uploaded {formatDateTime(doc.created_at)}</Typography>
                    </Stack>
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                      {doc.front_image_url && (
                        <Box>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="caption" color="text.secondary">Front</Typography>
                              {qualityMap[doc.front_image_url] && (
                                <Chip size="small" color={qualityMap[doc.front_image_url] === 'Good' ? 'success' : qualityMap[doc.front_image_url] === 'Fair' ? 'warning' : 'default'} label={`Quality: ${qualityMap[doc.front_image_url]}`} />
                              )}
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Button size="small" startIcon={<ZoomInIcon />} onClick={() => openViewer(`${doc.document_type} - Front`, [toAbsoluteResource(doc.front_image_url) || ''])} sx={{ minHeight: 44 }}>View</Button>
                              <Button size="small" component="a" href={toAbsoluteResource(doc.front_image_url)} download target="_blank" rel="noreferrer" sx={{ minHeight: 44 }}>Download</Button>
                            </Stack>
                          </Stack>
                          <Box 
                            component="img" 
                            onLoad={onImgLoad(doc.front_image_url)} 
                            onClick={() => openViewer(`${doc.document_type} - Front`, [toAbsoluteResource(doc.front_image_url) || ''])} 
                            src={toAbsoluteResource(doc.front_image_url)} 
                            alt={`${doc.document_type} front`} 
                            sx={{ maxHeight: 384, width: '100%', cursor: 'zoom-in', borderRadius: 2, border: 1, borderColor: 'divider', objectFit: 'contain' }} 
                          />
                        </Box>
                      )}
                      {doc.back_image_url && (
                        <Box>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="caption" color="text.secondary">Back</Typography>
                              {qualityMap[doc.back_image_url] && (
                                <Chip size="small" color={qualityMap[doc.back_image_url] === 'Good' ? 'success' : qualityMap[doc.back_image_url] === 'Fair' ? 'warning' : 'default'} label={`Quality: ${qualityMap[doc.back_image_url]}`} />
                              )}
                            </Stack>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Button size="small" startIcon={<ZoomInIcon />} onClick={() => openViewer(`${doc.document_type} - Back`, [toAbsoluteResource(doc.back_image_url) || ''])} sx={{ minHeight: 44 }}>View</Button>
                              <Button size="small" component="a" href={toAbsoluteResource(doc.back_image_url)} download target="_blank" rel="noreferrer" sx={{ minHeight: 44 }}>Download</Button>
                            </Stack>
                          </Stack>
                          <Box 
                            component="img" 
                            onLoad={onImgLoad(doc.back_image_url)} 
                            onClick={() => openViewer(`${doc.document_type} - Back`, [toAbsoluteResource(doc.back_image_url) || ''])} 
                            src={toAbsoluteResource(doc.back_image_url)} 
                            alt={`${doc.document_type} back`} 
                            sx={{ maxHeight: 384, width: '100%', cursor: 'zoom-in', borderRadius: 2, border: 1, borderColor: 'divider', objectFit: 'contain' }} 
                          />
                        </Box>
                      )}
                    </Box>
                    {doc.front_image_url && doc.back_image_url && (
                      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button size="small" onClick={() => openViewer(`${doc.document_type} - Compare`, [toAbsoluteResource(doc.front_image_url) || '', toAbsoluteResource(doc.back_image_url) || ''])} sx={{ minHeight: 44 }}>Compare side-by-side</Button>
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1">{dialogImages?.title ?? 'Document'}</Typography>
          <IconButton onClick={() => setDialogOpen(false)} sx={{ minHeight: 44, minWidth: 44 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {dialogImages && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: dialogImages.srcs.length > 1 ? 'repeat(2, 1fr)' : '1fr' }, gap: 2 }}>
              {dialogImages.srcs.map((src, idx) => (
                <ZoomPan key={idx} className="flex h-[70vh] items-center justify-center overflow-hidden rounded-lg border border-secondary bg-[var(--color-bg-elevated)]">
                  <Box component="img" src={src} alt={`doc-${idx}`} sx={{ maxHeight: '70vh', width: 'auto', userSelect: 'none' }} draggable={false} />
                </ZoomPan>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast((t) => ({ ...t, open: false }))}>
        <Alert severity={toast.severity} onClose={() => setToast((t) => ({ ...t, open: false }))}>{toast.message}</Alert>
      </Snackbar>
    </Box>
  );
};
