import { DroneArt, Icon } from "./Design";
import { remember } from "./LearnerControls";
export function Home({ navigate }: { navigate: (page: string) => void }) {
  return (
    <main className="home page-enter" id="main-content" tabIndex={-1}>
      <div className="home-greeting">
        <span className="eyebrow">KHÔNG GIAN LUYỆN BAY CỦA BẠN</span>
        <span className="home-coordinate">
          SÂN MÔ PHỎNG <i /> 01
        </span>
      </div>
      <section className="home-hero" aria-labelledby="welcome-heading">
        <div className="hero-copy">
          <span className="overline">
            <span className="status-dot" /> SẴN SÀNG KHÁM PHÁ
          </span>
          <h1 id="welcome-heading">
            Tự tin trên
            <br />
            từng <em>đường bay.</em>
          </h1>
          <p>
            Một khoảng trời để học hỏi, thử sức và tiến bộ.
            <br className="desktop-break" /> Bắt đầu từ những thao tác đơn giản
            nhất.
          </p>
          <button
            className="primary hero-start"
            onClick={() => navigate("Training")}
          >
            Bắt đầu luyện tập <Icon name="arrow" />
          </button>
          <span className="hero-note">
            <Icon name="keyboard" size={16} /> Dùng bàn phím hoặc tay điều khiển
          </span>
        </div>
        <div className="hero-visual">
          <div className="visual-top">
            <span>KHÁM PHÁ KHÔNG GIAN BAY</span>
            <span>01 — 04</span>
          </div>
          <DroneArt />
          <div className="visual-bottom">
            <span>
              <i /> MÔ PHỎNG TƯƠNG TÁC
            </span>
            <b>
              45 × 27 <small>m</small>
            </b>
          </div>
        </div>
      </section>
      <div className="section-heading">
        <h2>Tiếp tục hành trình</h2>
        <span>Mỗi lần bay, một bước tiến.</span>
      </div>
      <section
        className="home-destinations"
        aria-label="Khám phá các tính năng"
      >
        {[
          [
            "Mock Examination",
            "target",
            "Thử sức với bài thi",
            "Tự bay với điều kiện cố định, không có hỗ trợ.",
            "01",
          ],
          [
            "Session Review",
            "replay",
            "Xem lại bài bay",
            "Nhìn lại đường bay và hiểu rõ sự tiến bộ của bạn.",
            "02",
          ],
          [
            "System Configuration",
            "settings",
            "Cài đặt của bạn",
            "Chọn điều khiển và trải nghiệm hiển thị phù hợp.",
            "03",
          ],
        ].map(([page, icon, title, description, n]) => (
          <button
            key={page}
            className="destination"
            aria-label={title}
            onClick={() => navigate(page)}
          >
            <div className="destination-top">
              <span className="destination-icon">
                <Icon name={icon} size={24} />
              </span>
              <span className="destination-number">{n}</span>
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            <Icon name="arrow" />
          </button>
        ))}
      </section>
      <section className="first-flight">
        <span className="first-flight-icon">
          <Icon name="drone" size={25} />
        </span>
        <div>
          <h2>Lần đầu cầm lái?</h2>
          <p>
            Bắt đầu với cất cánh và giữ vị trí. Cứ thong thả, bạn có thể thử lại
            bất cứ lúc nào.
          </p>
        </div>
        <button
          className="text-button"
          onClick={() => {
            remember("uav-preferred-profile", "foundations");
            navigate("Training");
          }}
        >
          Khám phá bài cơ bản <Icon name="arrow" size={18} />
        </button>
      </section>
      <footer className="home-footer">
        <span>
          UAV ARENA <i /> HỌC HỎI QUA TỪNG ĐƯỜNG BAY
        </span>
        <p>Mô phỏng luyện tập · Bản ghi được lưu trên thiết bị này.</p>
      </footer>
    </main>
  );
}
