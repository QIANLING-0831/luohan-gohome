import { useEffect, useMemo, useState } from "react";
import type { Service, Technician } from "../types";
import { availabilityClient } from "../api/availability";
import {
  bookingDates,
  bookingTimes,
  fitsServiceBeforeEnd,
  overlapsBooking,
  slotIsPast,
  weekdayForDate,
} from "../lib/availability";

export interface AppointmentSlot {
  dateIndex: number;
  dateLabel: string;
  time: string;
}
interface Props {
  technician: Technician;
  services: Service[];
  selected: Service;
  selectedSlot: AppointmentSlot;
  onSelect: (service: Service) => void;
  onSlotSelect: (slot: AppointmentSlot) => void;
  onBack: () => void;
  onBook: () => void;
}

export function TechnicianDetail({
  technician: tech,
  services,
  selected,
  selectedSlot,
  onSelect,
  onSlotSelect,
  onBack,
  onBook,
}: Props) {
  const serviceDuration = selected.duration ?? 60;
  const dates = useMemo(bookingDates, []);
  const [availability, setAvailability] = useState({
    occupied: [] as string[],
    bookings: [] as Array<{ slot: string; duration: number }>,
    workStart: tech.workStart,
    workEnd: tech.workEnd,
    workDays: tech.workDays,
  });
  const [availabilityError, setAvailabilityError] = useState(false);
  useEffect(() => {
    setAvailabilityError(false);
    availabilityClient
      .get(tech.id)
      .then((next) => {
        setAvailability({ ...next, bookings: next.bookings ?? next.occupied.map((slot) => ({ slot, duration: 0 })) });
        setAvailabilityError(false);
      })
      .catch(() => setAvailabilityError(true));
  }, [tech.id]);
  const slots = availabilityError
    ? []
    : dates
        .flatMap((date, dateIndex) =>
          bookingTimes.map((time) => ({
            dateIndex,
            dateLabel: date.label,
            dateKey: date.dateKey,
            time,
          })),
        )
        .filter(
          (slot) =>
            availability.workDays.includes(weekdayForDate(slot.dateKey)) &&
            slot.time >= availability.workStart &&
            fitsServiceBeforeEnd(
              slot.time,
              serviceDuration,
              availability.workEnd,
            ) &&
            !slotIsPast(slot.dateKey, slot.time) &&
            !overlapsBooking(slot.dateKey, slot.time, serviceDuration, availability.bookings),
        )
        .slice(0, 3);
  useEffect(() => {
    if (
      slots.length &&
      !slots.some(
        (slot) =>
          slot.dateIndex === selectedSlot.dateIndex &&
          slot.time === selectedSlot.time,
      )
    )
      onSlotSelect(slots[0]);
  }, [availability, tech.id]);
  const chosen =
    slots.find(
      (slot) =>
        slot.dateIndex === selectedSlot.dateIndex &&
        slot.time === selectedSlot.time,
    ) ?? slots[0];
  return (
    <section className="screen active">
      <div className="detail-hero">
        <img src={tech.img} alt={tech.name} />
        <button className="back" onClick={onBack}>
          ‹
        </button>
        <span className="demo-badge">
          ● {availabilityError ? "档期加载失败" : slots.length ? "近期可预约" : "暂无档期"}
        </span>
        <div className="hero-info">
          <h1>
            {tech.name} · {tech.title}
          </h1>
          <div className="hero-meta">
            <span>★ {tech.rating}</span>
            <span className="verified">✓ 平台认证</span>
          </div>
        </div>
      </div>
      <div className="detail-body">
        <p className="intro">{tech.intro}</p>
        <div className="metric-row">
          <div className="metric">
            <strong>{tech.orders}</strong>
            <small>累计服务</small>
          </div>
          <div className="metric">
            <strong>{tech.onTimeRate}%</strong>
            <small>准时到达</small>
          </div>
          <div className="metric">
            <strong>
              {tech.experienceYears}年{tech.experienceYears >= 1 ? "+" : ""}
            </strong>
            <small>从业经验</small>
          </div>
        </div>
        <h2 className="sub-title">近期可约</h2>
        <div className="calendar-strip">
          {slots.map((slot, index) => {
            const active =
              slot.dateIndex === chosen?.dateIndex &&
              slot.time === chosen?.time;
            return (
              <button
                key={`${slot.dateKey}-${slot.time}`}
                className={`slot-pill ${index === 0 ? "hot" : ""} ${active ? "selected" : ""}`}
                aria-pressed={active}
                onClick={() => onSlotSelect(slot)}
              >
                {slot.dateLabel}
                <br />
                <b>{slot.time}</b>
                {active && <i>✓</i>}
              </button>
            );
          })}
          {!slots.length && <p className="slot-empty">{availabilityError ? "档期暂时无法加载，请稍后重试" : "未来三天暂无可约时间"}</p>}
        </div>
        {chosen && (
          <p className="slot-feedback" aria-live="polite">
            已选择 {chosen.dateLabel} {chosen.time}，预约表单将自动带入
          </p>
        )}
        <h2 className="sub-title">选择服务</h2>
        <div className="service-list">
          {services.map((service) => (
            <button
              key={service.id}
              className={`service ${service.id === selected.id ? "selected" : ""}`}
              onClick={() => onSelect(service)}
            >
              <span>
                <b>{service.name}</b>
                <small>{service.desc}</small>
              </span>
              <span className="service-price">
                ¥{service.price}
                <small>/次</small>
              </span>
            </button>
          ))}
        </div>
        <h2 className="sub-title">真实评价</h2>
        <div className="review-card">
          <span className="stars">★★★★★</span>
          <p>
            肩颈放松很到位，力度沟通也很细致。技师提前到达，用品都是当面拆封的。
          </p>
          <small>匿名用户 · 3天前</small>
        </div>
        <div className="sticky-cta">
          <button className="primary" disabled={!chosen} onClick={onBook}>
            {chosen
              ? `立即预约 · ${chosen.dateLabel} ${chosen.time} · ¥${selected.price}`
              : availabilityError ? "档期加载失败，请稍后重试" : "未来三天暂无可约"}
          </button>
        </div>
      </div>
    </section>
  );
}
