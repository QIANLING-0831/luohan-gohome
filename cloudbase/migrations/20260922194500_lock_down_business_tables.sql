-- All business data is accessed through the authenticated Express API.
-- CloudBase's client-facing PostgREST roles must not read these tables directly.
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Technician" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Service" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TechnicianService" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderStatusLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Favorite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PointRecord" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."User", public."Technician", public."AuditLog", public."Service", public."TechnicianService", public."Order", public."OrderStatusLog", public."Favorite", public."PointRecord" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public."Technician_id_seq", public."AuditLog_id_seq", public."OrderStatusLog_id_seq", public."PointRecord_id_seq" FROM PUBLIC, anon, authenticated;
