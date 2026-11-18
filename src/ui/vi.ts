import vocabulary from "./vi.json";
export const vi = (text: string | undefined): string =>
  text ? ((vocabulary as Record<string, string>)[text] ?? text) : "—";
import type { Attempt } from "../training/Session";
import type { Annotation } from "../training/records";
export function learnerReport(a: Attempt, notes: Annotation[] = []) {
  return [
    "UAV ARENA — BÁO CÁO LUYỆN BAY MÔ PHỎNG",
    "Chỉ dùng luyện tập. Không phải giấy phép hoặc kết quả sát hạch chính thức.",
    `Học viên: ${vi(a.candidate)}`,
    `Mã bài bay: ${a.id} · ${new Date(a.createdAt).toLocaleString("vi-VN")}`,
    `Bài bay: ${vi(a.profile.name)} · phiên bản ${a.profile.version}`,
    `Trạng thái: ${vi(a.status)} · ${vi(a.result.decision)}`,
    `Điểm luyện tập: ${a.result.practiceScore.toFixed(1)}/100. Điểm cao không tự kết luận đạt.`,
    `Phần đã hoàn thành: ${a.result.completedTasks.map((id) => vi(a.profile.tasks.find((t) => t.id === id)?.label ?? id)).join("; ") || "Chưa có"}`,
    `Mốc đường bay chưa đi qua: ${a.result.missedRouteGates}`,
    `Lệch ngang lớn nhất: ${a.result.maxLateral.toFixed(2)} m`,
    `Lệch độ cao lớn nhất: ${a.result.maxAltitudeError.toFixed(2)} m`,
    `Tốc độ lớn nhất: ${a.result.maxSpeed.toFixed(2)} m/s`,
    `Độ lệch hạ cánh: ${a.result.landingError === null ? "Chưa ghi nhận" : a.result.landingError.toFixed(2) + " m"}`,
    `Nguồn điều khiển: ${vi(a.controller.source)} · ${vi(a.controller.device)}. Chưa kiểm chứng bằng phần cứng thực.`,
    "Chế độ bay: cần ra lệnh vận tốc theo hướng máy bay, lên xuống và xoay; hệ thống ổn định vị trí khi thả cần. Không phải ga trực tiếp hoặc điều khiển góc nghiêng.",
    `Vị trí người lái: X=${a.pilotStation.x}, Z=${a.pilotStation.z} m; mắt cao ${a.pilotStation.eyeHeight} m; góc nhìn dọc ${a.pilotStation.verticalFov}°. Vị trí tạm đề xuất.`,
    `Thời tiết lúc chuẩn bị: gió ${a.initialWeather.wind} m/s, gió giật ${a.initialWeather.gust} m/s; mưa ${a.initialWeather.rain}. Seed ${a.weatherSeed}.`,
    `Kiểm tra trước bay: ${a.preflight.every(Boolean) ? "Đủ các xác nhận" : "Chưa đủ"} · sau bay: ${a.postflight.every(Boolean) ? "Đủ các xác nhận" : "Chưa đủ"}`,
    `Số mẫu ghi: ${a.frames.length}. Bước vật lý ${a.fixedDt} giây; ghi mỗi ${a.recordEverySteps} bước. Thời gian thực bị bỏ qua khi máy chậm: ${a.droppedSimulationSeconds.toFixed(3)} giây.`,
    "GIỚI HẠN CẦN HIỂU",
    "Tiêu chí là giả định luyện tập, cần giảng viên đánh giá. Mô hình máy bay, quan sát trên màn hình, tay điều khiển và khả năng chuyển kỹ năng ra thực địa chưa được xác minh.",
    "Bản ghi được giữ nguyên. Nhận xét được thêm riêng; checksum không phải chữ ký thiết bị hay hồ sơ sát hạch được chứng thực.",
    "NHẬN XÉT CỦA GIẢNG VIÊN",
    ...notes.map((n) => `${n.at.toFixed(2)} giây · ${n.author}: ${n.text}`),
    "PHỤ LỤC KỸ THUẬT — giữ mã gốc để đối chiếu JSON/CSV",
    `Phần mềm: ${a.softwareVersion} · tiêu chí: ${a.rules.version} · ${a.rules.status} · ${a.rules.source}`,
    `Thời gian vượt giới hạn: ${JSON.stringify(a.result.violations)}`,
    ...a.events.map((e) => `${e.time.toFixed(3)} s · ${e.code}: ${e.detail}`),
    ...a.result.limitations,
  ].join("\n");
}
