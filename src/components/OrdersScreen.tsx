import { useEffect, useState } from "react";
import type { Order, Service, Technician } from "../types";
import { orderStatuses } from "../data";
import { OrderTrackingMap, trackedDistance } from "./OrderTrackingMap";

interface Props {
  order: Order | null;
  technician?: Technician;
  service?: Service;
  onHome: () => void;
  onUpdate: (order: Order) => void;
  onCancel: () => void;
  onNotify: (message: string) => void;
}
interface ChatMessage {
  from: "them" | "me";
  text: string;
}
type Panel = "chat" | "cancel" | "review" | null;

export function OrdersScreen({
  order,
  technician,
  service,
  onHome,
  onUpdate,
  onCancel,
  onNotify,
}: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { from: "them", text: "您好，我已收到预约，会按时到达。" },
  ]);
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewTags, setReviewTags] = useState<string[]>(["手法专业"]);
  const [reviewText, setReviewText] = useState("");

  useEffect(() => {
    if (
      !order ||
      order.status < 2 ||
      order.status >= 4 ||
      order.etaSeconds <= 0
    )
      return;
    const timer = setInterval(
      () =>
        onUpdate({ ...order, etaSeconds: Math.max(0, order.etaSeconds - 1) }),
      1000,
    );
    return () => clearInterval(timer);
  }, [order, onUpdate]);

  if (!order || !technician || !service)
    return (
      <section className="screen active">
        <header>
          <div className="brand">我的订单</div>
        </header>
        <div className="orders-empty">
          <div style={{ fontSize: 52 }}>⌛</div>
          <b>暂无进行中的订单</b>
          <p>选择一位附近技师，开始预约服务</p>
          <button className="secondary" onClick={onHome}>
            去看看
          </button>
        </div>
      </section>
    );

  const distance = trackedDistance(technician, order.status);
  const eta =
    order.status < 2
      ? "等待接单"
      : order.status < 4
        ? `${String(Math.floor(order.etaSeconds / 60)).padStart(2, "0")}:${String(order.etaSeconds % 60).padStart(2, "0")}`
        : order.status === 4
          ? "进行中"
          : "已结束";
  const advance = () => {
    if (order.status === 5) {
      if (order.reviewed)
        return onNotify(`本次服务已评价 ${order.reviewRating} 星`);
      return setPanel("review");
    }
    onUpdate({ ...order, status: order.status + 1 });
    onNotify(`订单已更新为「${orderStatuses[order.status + 1]}」`);
  };
  const sendMessage = (text = message) => {
    const clean = text.trim();
    if (!clean) return;
    setMessages((current) => [...current, { from: "me", text: clean }]);
    setMessage("");
    setTimeout(
      () =>
        setMessages((current) => [
          ...current,
          { from: "them", text: "收到，我会留意并提前联系您。" },
        ]),
      650,
    );
  };
  const toggleReviewTag = (tag: string) =>
    setReviewTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  const submitReview = () => {
    onUpdate({ ...order, reviewed: true, reviewRating: rating });
    setPanel(null);
    onNotify(`评价提交成功，感谢你的 ${rating} 星好评`);
  };

  return (
    <>
      <section className="screen active">
      <header>
        <div className="brand">我的订单</div>
        <button
          className="icon-btn"
          aria-label="电话联系技师"
          onClick={() => onNotify(`正在呼叫${technician.name}（演示）`)}
        >
          ☏
        </button>
      </header>
      <div className="section-head">
        <h2>服务进度</h2>
        <span>
          <i className="live-dot" />
          实时同步
        </span>
      </div>
      <div className="orders">
        <div className="order-card">
          <div className="order-top">
            <img src={technician.img} alt={technician.name} />
            <span>
              <b>
                {technician.name} · {service.name}
              </b>
              <small>
                {order.dateLabel} {order.time} · {order.intensity}力度
              </small>
            </span>
            <span className="status-badge">{orderStatuses[order.status]}</span>
          </div>
          <div className="order-settlement">
            <span>
              <small>本单实付</small>
              <b>¥{order.paidAmount ?? service.price}</b>
            </span>
            <span>
              <small>优惠明细</small>
              <b>
                {order.discount
                  ? `${order.couponLabel} -¥${order.discount}`
                  : "未使用优惠"}
              </b>
            </span>
          </div>
          <div className="eta">
            <span>
              <small>{order.status < 4 ? "预计抵达" : "当前进度"}</small>
              <b>
                {order.status < 4
                  ? "安心等待，状态实时更新"
                  : "服务全程由平台保障"}
              </b>
            </span>
            <strong>{eta}</strong>
          </div>
          <div className="order-map-wrap">
            <OrderTrackingMap technician={technician} status={order.status} />
            <div className="track-legend">
              <span>
                <b>
                  {order.status < 2
                    ? "技师位置已确认"
                    : order.status < 4
                      ? "技师正前往服务地址"
                      : "技师已到达服务地址"}
                </b>
                <small>蓝色标记为你的服务地址</small>
              </span>
              <span className="track-distance">
                {distance < 0.05 ? "已到达" : `${distance.toFixed(1)}km`}
                <small>{technician.name} → 我</small>
              </span>
            </div>
          </div>
          <div className="order-address">
            <span>⌖</span>
            <span>
              <small>服务地址</small>
              <b>{order.address?.label ?? "静安嘉里中心 · 2号楼"}</b>
            </span>
          </div>
          <div className="safe-code">
            <span>
              <small>本次服务安全码</small>
              <br />
              <b>见面后请核验</b>
            </span>
            <strong>8 6 1 9</strong>
          </div>
          <div className="timeline">
            {orderStatuses.map((item, index) => (
              <div
                key={item}
                className={`step ${index < order.status ? "done" : index === order.status ? "current" : ""}`}
              >
                <i className="step-dot" />
                <span>
                  <b>{item}</b>
                  <br />
                  <small>
                    {index === order.status
                      ? "当前状态"
                      : index < order.status
                        ? "已完成"
                        : "等待更新"}
                  </small>
                </span>
              </div>
            ))}
          </div>
          {order.status < 2 && (
            <button className="cancel-link" onClick={() => setPanel("cancel")}>
              取消订单 · 查看退款规则
            </button>
          )}
          <div className="status-actions">
            <button className="secondary" onClick={() => setPanel("chat")}>
              在线联系
            </button>
            <button className="primary" onClick={advance}>
              {order.status === 5
                ? order.reviewed
                  ? `已评价 ${order.reviewRating}★`
                  : "评价本次服务"
                : `推进到「${orderStatuses[order.status + 1]}」`}
            </button>
          </div>
        </div>
      </div>
      </section>
      <div
        className={`sheet-mask ${panel ? "open" : ""}`}
        onClick={() => setPanel(null)}
      >
        <div className="sheet" onClick={(event) => event.stopPropagation()}>
          <div className="grab" />
          {panel === "chat" && (
            <>
              <h2>联系 {technician.name}</h2>
              <div className="chat-status">
                <i className="live-dot" />
                技师在线 · 通常即时回复
              </div>
              <div className="chat-body">
                {messages.map((item, index) => (
                  <div
                    key={`${item.text}-${index}`}
                    className={`bubble ${item.from}`}
                  >
                    {item.text}
                  </div>
                ))}
              </div>
              <div className="quick-replies">
                {["请提前电话联系", "我在大堂等您", "到了请告诉我"].map(
                  (item) => (
                    <button key={item} onClick={() => sendMessage(item)}>
                      {item}
                    </button>
                  ),
                )}
              </div>
              <div className="chat-actions">
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && sendMessage()}
                  placeholder="输入消息"
                />
                <button className="primary" onClick={() => sendMessage()}>
                  发送
                </button>
              </div>
            </>
          )}
          {panel === "cancel" && (
            <>
              <h2>确认取消订单？</h2>
              <div className="refund-card">
                <b>预计退款 ¥{order.paidAmount ?? service.price}</b>
                <p>技师出发前取消，实付费用将原路退回，预计 1–3 个工作日到账。</p>
              </div>
              <div className="dialog-actions">
                <button className="secondary" onClick={() => setPanel(null)}>
                  继续保留
                </button>
                <button className="danger-btn" onClick={onCancel}>
                  确认取消
                </button>
              </div>
            </>
          )}
          {panel === "review" && (
            <>
              <h2>评价本次服务</h2>
              <p className="review-sub">你的评价会帮助其他用户选择技师。</p>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    aria-label={`${star}星`}
                    className={star <= rating ? "active" : ""}
                    onClick={() => setRating(star)}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div className="filter-tags">
                {["手法专业", "准时到达", "沟通耐心", "环境整洁"].map((tag) => (
                  <button
                    key={tag}
                    className={reviewTags.includes(tag) ? "active" : ""}
                    onClick={() => toggleReviewTag(tag)}
                  >
                    {reviewTags.includes(tag) ? "✓ " : "+ "}
                    {tag}
                  </button>
                ))}
              </div>
              <textarea
                className="note-input"
                value={reviewText}
                onChange={(event) => setReviewText(event.target.value)}
                placeholder="分享本次服务体验（选填）"
              />
              <button className="primary review-submit" onClick={submitReview}>
                提交 {rating} 星评价
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
