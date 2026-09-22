-- Interview-only sample records; fixed IDs keep this migration idempotent.
INSERT INTO public."Service" ("id", "name", "description", "price", "duration") VALUES
  ('neck', '肩颈深度放松', '60分钟 · 针对久坐疲劳', 239, 60),
  ('oil', '精油推背', '80分钟 · 全背舒缓', 299, 80),
  ('tuina', '中式经络推拿', '90分钟 · 全身经络疏解', 369, 90)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO public."User" ("id", "phone", "name", "role", "preferences", "passwordHash", "createdAt", "updatedAt") VALUES
  ('demo-user', '13800138000', '罗女士', 'USER', '["适中力度","肩颈重点"]', 'scrypt:580f88bd2bda20437eaf522db8c9b5bb:02b8245ffb3eb254f970b8ebb19ab690433266e018c787ce5df8ccfbcd523f3fc2f6bd51d0aaddfcf8a93e923de41d1656ec87cd7a9cb657478727a99952342d', now() - interval '90 days', now()),
  ('demo-tech-user', '13900139000', '陈静技师', 'TECHNICIAN', '[]', 'scrypt:580f88bd2bda20437eaf522db8c9b5bb:02b8245ffb3eb254f970b8ebb19ab690433266e018c787ce5df8ccfbcd523f3fc2f6bd51d0aaddfcf8a93e923de41d1656ec87cd7a9cb657478727a99952342d', now() - interval '180 days', now()),
  ('demo-admin', '13700137000', '平台管理员', 'ADMIN', '[]', 'scrypt:1fb172aaa3b16e647a2cd0a51490b71d:08fa067b67e35fd6026ba330a341701e9491a4b5f8e2d6fbed917c225c98d12dce9139304fd5138113224f1cdd1309adf6eb686e2d267f0d850c52306597746d', now() - interval '180 days', now()),
  ('demo-customer-2', '13800138001', '张先生（演示）', 'USER', '["中式推拿"]', NULL, now() - interval '45 days', now()),
  ('demo-customer-3', '13800138002', '王女士（演示）', 'USER', '["精油推背","轻柔力度"]', NULL, now() - interval '14 days', now())
ON CONFLICT ("phone") DO NOTHING;

INSERT INTO public."Technician" ("id", "name", "title", "rating", "orderCount", "latitude", "longitude", "price", "imageKey", "intro", "active", "userId") VALUES
  (1, '陈静', '金牌理疗师', 4.98, 862, 31.2339, 121.4672, 239, 'chen', '8年经络理疗经验，擅长肩颈放松与久坐疲劳改善。', true, 'demo-tech-user'),
  (2, '周岚', '资深推拿师', 4.96, 619, 31.2301, 121.4603, 269, 'zhou', '专注中式推拿与精油舒缓，服务细致。', true, NULL),
  (3, '林悦', '芳疗师', 4.93, 476, 31.2266, 121.4728, 299, 'lin', '结合呼吸节奏与精油按摩，打造舒缓体验。', true, NULL)
ON CONFLICT ("id") DO NOTHING;
SELECT setval(pg_get_serial_sequence('public."Technician"', 'id'), GREATEST(3, (SELECT MAX("id") FROM public."Technician")));

INSERT INTO public."TechnicianService" ("technicianId", "serviceId") VALUES
  (1, 'neck'), (1, 'oil'), (1, 'tuina'), (2, 'neck'), (2, 'oil'), (3, 'oil'), (3, 'tuina')
ON CONFLICT DO NOTHING;

INSERT INTO public."Order" ("id", "userId", "technicianId", "serviceId", "status", "dateLabel", "appointmentAt", "intensity", "paymentMethod", "addressLabel", "addressDetail", "note", "originalPrice", "discount", "paidAmount", "couponLabel", "createdAt", "updatedAt") VALUES
  ('LHDEMO1001', 'demo-user', 1, 'neck', 'PENDING', '明天', now() + interval '1 day', '适中', 'wechat', '静安嘉里中心 · 2号楼', '上海市静安区南京西路1515号', '肩颈重点放松', 239, 30, 209, '新客立减券', now(), now()),
  ('LHDEMO1002', 'demo-customer-2', 2, 'oil', 'ACCEPTED', '今天', now() + interval '4 hours', '适中', 'wechat', '静安寺商圈', '上海市静安区南京西路', '', 299, 0, 299, '', now() - interval '1 day', now()),
  ('LHDEMO1003', 'demo-customer-3', 3, 'tuina', 'DEPARTED', '今天', now() + interval '2 hours', '轻柔', 'alipay', '人民广场附近', '上海市黄浦区人民大道', '', 369, 20, 349, '满减券', now() - interval '2 days', now()),
  ('LHDEMO1004', 'demo-customer-2', 1, 'neck', 'ARRIVED', '今天', now() + interval '1 hour', '适中', 'wechat', '静安寺商圈', '上海市静安区南京西路', '', 239, 0, 239, '', now() - interval '3 days', now()),
  ('LHDEMO1005', 'demo-customer-3', 2, 'oil', 'IN_SERVICE', '今天', now(), '轻柔', 'wechat', '人民广场附近', '上海市黄浦区人民大道', '', 299, 0, 299, '', now() - interval '4 days', now()),
  ('LHDEMO1006', 'demo-user', 3, 'tuina', 'COMPLETED', '上周', now() - interval '5 days', '适中', 'wechat', '静安嘉里中心 · 2号楼', '上海市静安区南京西路1515号', '', 369, 30, 339, '满减券', now() - interval '6 days', now())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO public."OrderStatusLog" ("orderId", "status")
SELECT o."id", o."status" FROM public."Order" o WHERE o."id" LIKE 'LHDEMO100%'
AND NOT EXISTS (SELECT 1 FROM public."OrderStatusLog" l WHERE l."orderId" = o."id");
