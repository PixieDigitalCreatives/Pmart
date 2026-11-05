import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TbCheck as Check, TbX as X, TbUpload as Upload, TbSearch as Search, TbExternalLink as ExternalLink, TbPhotoOff as ImageOff } from 'react-icons/tb';
import { inventoryService } from '@/services/inventoryService';
import { apiErrorMessage } from '@/services/apiClient';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, LoadingState, EmptyState, Modal, FormField } from '@/components/ui';
import { ProductThumb, ImageStatusBadge } from '@/components/inventory/ProductThumb';
import { Pagination } from '@/components/inventory/Pagination';
import { dateTime } from '@/utils/format';
import { prepareImage } from '@/utils/imageFile';
import '@/components/inventory/inventory.scss';
import './images.scss';

const ORIGIN = {
  UPLOAD: 'Photo uploaded by staff',
  URL: 'Image URL added by staff',
  OPEN_FOOD_FACTS: 'Open Food Facts (barcode match)',
  OPEN_BEAUTY_FACTS: 'Open Beauty Facts (barcode match)',
  OPEN_PRODUCTS_FACTS: 'Open Products Facts (barcode match)'
};

/** Shows a candidate image. Uploaded files need an authenticated fetch; remote candidates load from the source. */
const CandidatePreview = ({ image }) => {
  const [src, setSrc] = useState(image.remoteUrl && image.status !== 'APPROVED' ? image.remoteUrl : null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let revoke;
    if (!src) {
      inventoryService
        .imagePreviewUrl(image._id)
        .then((url) => {
          if (url.startsWith('blob:')) revoke = url;
          setSrc(url);
        })
        .catch(() => setFailed(true));
    }
    return () => revoke && URL.revokeObjectURL(revoke);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image._id]);
  if (failed) return <div className="candidate-img candidate-img--empty">Could not load</div>;
  return src ? <img src={src} alt="Candidate" className="candidate-img" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <div className="candidate-img candidate-img--empty">Loading…</div>;
};

/**
 * Image-matching dashboard. Candidates come only from exact barcode matches or from staff, and stay
 * "Pending verification" until someone with images.verify compares them with the product and approves.
 */
export const ImageReviewPage = () => {
  const { can } = useAuth();
  const toast = useToast();
  const verifier = can('images.verify');
  const [status, setStatus] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState('');
  const [searching, setSearching] = useState(false);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [uploadFor, setUploadFor] = useState(null);
  const [upload, setUpload] = useState({ file: null, dataUrl: '', sourceUrl: '', imageUrl: '', markVerified: true });
  const [uploadError, setUploadError] = useState('');

  const load = () =>
    inventoryService
      .imageQueue({ status, search: search.trim() || undefined, page, limit: 12 })
      .then(setData)
      .catch((err) => toast.error(apiErrorMessage(err, 'Could not load images.')));

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, page]);

  const act = async (id, fn, message) => {
    setBusy(id);
    try {
      await fn();
      toast.success(message);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const findBatch = async () => {
    setSearching(true);
    try {
      const results = await inventoryService.findCandidates({ limit: 5 });
      const found = results.filter((r) => r.created > 0).length;
      toast.success(results.length ? `Searched ${results.length} products by barcode; ${found} new candidate(s).` : 'No products are waiting for a barcode search.');
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSearching(false);
    }
  };

  const saveUpload = async () => {
    setUploadError('');
    try {
      if (upload.dataUrl) {
        await inventoryService.uploadImage(uploadFor._id, { dataUrl: upload.dataUrl, sourceUrl: upload.sourceUrl || undefined, markVerified: verifier && upload.markVerified });
      } else if (upload.imageUrl) {
        await inventoryService.addImageUrl(uploadFor._id, { imageUrl: upload.imageUrl.trim(), sourceUrl: upload.sourceUrl.trim() || undefined });
      } else {
        return setUploadError('Choose a photo or enter an image URL.');
      }
      toast.success('Image saved');
      setUploadFor(null);
      load();
    } catch (err) {
      setUploadError(apiErrorMessage(err));
    }
  };

  const counts = data?.counts || {};
  return (
    <div>
      <PageHeader
        title="Product images"
        subtitle="Only exact photographs of the product sold. Candidates are found by barcode and must be approved by a person before they are shown."
        action={
          (verifier || can('catalog.manage')) && (
            <Button variant="secondary" onClick={findBatch} isLoading={searching}>
              <Search size={16} style={{ marginRight: 6 }} />
              Search next 5 by barcode
            </Button>
          )
        }
      />
      <div className="tab-bar">
        {[
          ['PENDING', 'Pending verification'],
          ['NOT_AVAILABLE', 'Not available'],
          ['VERIFIED', 'Verified']
        ].map(([k, label]) => (
          <Button key={k} size="sm" variant={status === k ? 'dark' : 'secondary'} onClick={() => { setStatus(k); setPage(1); }}>
            {label} ({(counts[k] || 0).toLocaleString('en-IN')})
          </Button>
        ))}
      </div>
      <div className="toolbar">
        <div className="toolbar-grow">
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Product name, code, barcode, company or manufacturer" aria-label="Search products" />
        </div>
      </div>

      {!data ? (
        <LoadingState />
      ) : data.rows.length === 0 ? (
        <EmptyState icon={ImageOff} title="Nothing here" description={status === 'PENDING' ? 'No candidates are waiting for review.' : 'No products in this state.'} />
      ) : (
        <div className="image-review-list">
          {data.rows.map((p) => {
            const pending = p.images.filter((i) => i.status === 'PENDING');
            const approved = p.images.find((i) => i.status === 'APPROVED');
            return (
              <Card key={p._id} className="image-review-card">
                <div className="image-review-product">
                  <ProductThumb product={p} size={96} showLabel />
                  <div>
                    <Link to={`/admin/products/${p._id}`} className="font-bold">
                      {p.name}
                    </Link>
                    <div className="detail-grid mt-2">
                      {[
                        ['Barcode', <span className="mono">{p.barcode || '—'}</span>],
                        ['Code', <span className="mono">{p.code || '—'}</span>],
                        ['Unit', p.unit || '—'],
                        ['Manufacturer', p.manufacturer || '—'],
                        ['Company', p.company || '—'],
                        ['Status', <ImageStatusBadge status={p.image?.status} />]
                      ].map(([l, v]) => (
                        <div key={l}>
                          <div className="detail-label">{l}</div>
                          <div className="detail-value">{v}</div>
                        </div>
                      ))}
                    </div>
                    {p.image?.lastSearchedAt && <p className="muted-note mt-2">Last barcode search {dateTime(p.image.lastSearchedAt)}</p>}
                  </div>
                </div>

                <div className="candidate-list">
                  {[...pending, ...(approved ? [approved] : [])].map((img) => (
                    <div key={img._id} className={`candidate ${img.status === 'APPROVED' ? 'is-approved' : ''}`}>
                      <CandidatePreview image={img} />
                      <div className="candidate-info">
                        <span className={`badge ${img.status === 'APPROVED' ? 'badge-success' : 'badge-warning'}`}>{img.status === 'APPROVED' ? 'Verified photo' : 'Unverified candidate'}</span>
                        <div className="text-sm mt-1">{ORIGIN[img.origin] || img.origin}</div>
                        {img.sourceProductName && (
                          <div className="text-sm">
                            Source says: <strong>{[img.sourceBrand, img.sourceProductName, img.sourceQuantity].filter(Boolean).join(' · ')}</strong>
                          </div>
                        )}
                        {img.matchedBarcode && <div className="muted-note">Matched barcode {img.matchedBarcode}</div>}
                        {img.sourceUrl && (
                          <a href={img.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-sm inline-flex items-center gap-1">
                            Source page <ExternalLink size={12} />
                          </a>
                        )}
                        {img.license && <div className="muted-note">{img.license}</div>}
                        {verifier && (
                          <div className="actions-row mt-2">
                            {img.status === 'PENDING' && (
                              <Button size="sm" variant="primary" isLoading={busy === img._id} onClick={() => act(img._id, () => inventoryService.approveImage(img._id), 'Photo verified')}>
                                <Check size={14} style={{ marginRight: 4 }} />
                                Approve
                              </Button>
                            )}
                            <Button size="sm" variant="secondary" disabled={busy === img._id} onClick={() => { setRejecting(img); setReason(''); }}>
                              <X size={14} style={{ marginRight: 4 }} />
                              {img.status === 'APPROVED' ? 'Remove' : 'Reject'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {pending.length === 0 && !approved && <p className="muted-note">No candidate image. Upload the actual photo of this product.</p>}
                </div>

                {(verifier || can('catalog.manage')) && (
                  <div className="actions-row mt-2">
                    <Button size="sm" variant="secondary" onClick={() => { setUploadFor(p); setUpload({ file: null, dataUrl: '', sourceUrl: '', imageUrl: '', markVerified: true }); setUploadError(''); }}>
                      <Upload size={14} style={{ marginRight: 4 }} />
                      {approved ? 'Replace photo' : 'Upload photo'}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={!p.barcodes?.length || busy === p._id} onClick={() => act(p._id, () => inventoryService.findCandidates({ productIds: [p._id] }), 'Barcode search finished')}>
                      <Search size={14} style={{ marginRight: 4 }} />
                      Search by barcode
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {data && <Pagination page={data.pagination.page} pages={data.pagination.pages} total={data.pagination.total} onChange={setPage} />}

      <Modal isOpen={Boolean(rejecting)} onClose={() => setRejecting(null)} title={rejecting?.status === 'APPROVED' ? 'Remove verified photo?' : 'Reject this candidate?'}>
        <p className="dialog-text">The product will show “Image Not Available” until another photo is verified.</p>
        <FormField label="Reason" htmlFor="rej-reason" hint="e.g. different variant, wrong pack size, not the product">
          <Input id="rej-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} autoFocus />
        </FormField>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setRejecting(null)}>
            Keep
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              const img = rejecting;
              setRejecting(null);
              act(img._id, () => inventoryService.rejectImage(img._id, reason.trim() || undefined), img.status === 'APPROVED' ? 'Photo removed' : 'Candidate rejected');
            }}
          >
            {rejecting?.status === 'APPROVED' ? 'Remove' : 'Reject'}
          </Button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(uploadFor)} onClose={() => setUploadFor(null)} title={`Photo for ${uploadFor?.name || ''}`}>
        <FormField label="Photograph of the actual product" htmlFor="up-file" hint="JPEG, PNG or WebP. Large photos are resized to 1000 px.">
          <input
            id="up-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                setUpload({ ...upload, file: f, dataUrl: await prepareImage(f), imageUrl: '' });
              } catch (err) {
                setUploadError(err.message);
              }
            }}
          />
        </FormField>
        {upload.dataUrl && <img src={upload.dataUrl} alt="Selected" className="candidate-img mb-3" />}
        {!upload.dataUrl && (
          <FormField label="…or the image URL from the manufacturer / distributor page" htmlFor="up-url" hint="Added as an unverified candidate; it is downloaded into PMart when approved.">
            <Input id="up-url" value={upload.imageUrl} onChange={(e) => setUpload({ ...upload, imageUrl: e.target.value })} placeholder="https://…" />
          </FormField>
        )}
        <FormField label="Source page (optional)" htmlFor="up-source">
          <Input id="up-source" value={upload.sourceUrl} onChange={(e) => setUpload({ ...upload, sourceUrl: e.target.value })} placeholder="https://…" />
        </FormField>
        {verifier && upload.dataUrl && (
          <label className="flex items-center gap-2 text-sm mb-3" htmlFor="up-verify">
            <input id="up-verify" type="checkbox" checked={upload.markVerified} onChange={(e) => setUpload({ ...upload, markVerified: e.target.checked })} />I have checked this is the exact product and pack — mark as verified
          </label>
        )}
        {uploadError && <div className="alert alert-error mb-3">{uploadError}</div>}
        <Button variant="primary" onClick={saveUpload}>
          Save
        </Button>
      </Modal>
    </div>
  );
};
