# Nghiên cứu UX cho người học Việt Nam

Ngày tra cứu: 18-11-2026. Đây là nghiên cứu tài liệu và đánh giá phần mềm, **chưa phải nghiên cứu thực địa với người dùng Việt Nam**. Các nhóm người dùng dưới đây đến từ yêu cầu sản phẩm; không được hiểu là kết quả khảo sát dân số. Chưa có phỏng vấn, thử nghiệm với học viên hoặc xác nhận của trung tâm đào tạo.

## Người dùng và công việc

- **Người mới học:** mở ứng dụng, chọn bài, nhận biết thiết bị, cất cánh thủ công và hiểu bước tiếp theo. Nguy cơ nhầm H với vị trí đứng, bay mẫu với bài của mình, thả cần với tắt động cơ. Đề xuất: bốn hành động ở trang đầu, hướng dẫn có thể bỏ qua, câu lệnh ngắn và giữ nguyên tên nút giữa các màn hình.
- **Người học lớn tuổi, khoảng 50–70+:** có thể cần chữ lớn, thời gian đọc và thao tác chậm hơn; không giả định mọi người đều giảm thị lực hoặc thiếu kinh nghiệm máy tính. Công việc giống người mới nhưng cần kiểm tra thực tế về đọc dấu tiếng Việt, tìm nút, dùng chuột và ghi nhớ phím. Đề xuất: chữ chính 16 px, đích bấm 44 px, tương phản rõ, thao tác nhìn quanh bằng nút thay cho việc chỉ dựa vào kéo chuột.
- **Giảng viên:** chọn bài nhanh, đặt thời tiết thi thử, theo dõi học viên, xem đường bay/lỗi, phát lại và nhận xét. Không cần đọc trục motor để giảng dạy thường ngày. Đề xuất: khu Giảng viên riêng, kết quả tiếng Việt trước số liệu chi tiết, giữ bản ghi gốc khi nhận xét.
- **Quản trị kỹ thuật:** gán trục, hiệu chỉnh, kiểm tra hiệu năng và vị trí người lái. Đề xuất: Cài đặt nâng cao, có thông tin nguồn và giới hạn; không đưa dữ liệu thô lên trang đầu của học viên.

## Bằng chứng và suy luận thiết kế

[WCAG 2.2, W3C Recommendation 12-12-2024](https://www.w3.org/TR/WCAG22/) quy định các tiêu chí về tương phản, bàn phím, tiêu điểm, phóng chữ, ngôn ngữ, nhãn và thông báo trạng thái. Dùng làm nền tảng kiểm tra, không tuyên bố ứng dụng đã được chứng nhận WCAG. Canvas 3D không có đường bay thay thế hoàn toàn cho người không nhìn thấy; đánh giá trợ năng cần xét mục đích huấn luyện thị giác.

[Hướng dẫn kích thước mục tiêu của W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) giải thích mức tối thiểu AA 24 × 24 CSS px với ngoại lệ/khoảng cách; mức Enhanced dùng 44 × 44. Dự án chọn 44 px cho nút chính để dễ thao tác hơn, đây là quyết định thiết kế chứ không phải yêu cầu riêng của người Việt.

[W3C về nội dung dễ hiểu](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o3-clear-content/) đề nghị từ quen thuộc, câu ngắn, nội dung chia đoạn và khoảng trắng. Đây là hướng dẫn bổ sung, không phải tiêu chí WCAG bắt buộc. Áp dụng: “Mức gió”, “Bật động cơ”, “Thử lại từ H”, giải thích lỗi cùng bước khắc phục; thuật ngữ kỹ thuật nằm trong phần mở rộng.

[W3C về người dùng lớn tuổi](https://www.w3.org/WAI/older-users/developing/) tổng hợp nhu cầu về đọc chữ, tương phản, thao tác và điều hướng rõ ràng. Suy luận cho sản phẩm: không bắt nhớ toàn bộ phím; có nút nhìn trái/phải/lên/xuống và Nhìn thẳng. Nhu cầu cụ thể tại trung tâm Việt Nam vẫn cần đo, không suy từ tuổi thành năng lực.

[W3C về tương phản tối thiểu](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) hỗ trợ kiểm tra màu chữ. Thiết kế dùng nền sáng và chữ xanh đậm, kèm trạng thái bằng chữ, không chỉ dùng chấm màu. [Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum) là cơ sở kiểm tra thanh điều hướng/hộp thoại không che hoàn toàn tiêu điểm. Cần tiếp tục kiểm tra trình đọc màn hình và phóng to trên thiết bị lớp học.

## Đối chiếu hệ thống huấn luyện

[DJI Flight Simulator User Manual v1.4, 2020.06](https://dl.djicdn.com/downloads/simulator/20200612/DJI_Flight_Simulator_User_Manual_v1.4_EN.pdf), trang in 8, 13 và 15–17: tài liệu mô tả mô-đun kỹ năng, tự do và ứng dụng; có điều khiển tay/bàn phím, các góc nhìn và cài đặt riêng. Quan sát từ tài liệu, không phải dùng thử sản phẩm. Rút ra: nhóm theo công việc và tách cài đặt nâng cao; không sao chép phần giải trí hay coi chế độ camera của DJI là quy định sát hạch Việt Nam. Tài liệu lịch sử không xác nhận khả năng cung cấp/hỗ trợ hiện tại.

[Trang RealFlight Trainer Edition do Horizon Hobby phát hành trên Steam](https://store.steampowered.com/app/1314820/RealFlight_Trainer_Edition/), mục đào tạo và bộ điều khiển: nhà phát hành mô tả bài hướng dẫn của phi công và nhiều cách kết nối bộ điều khiển, trong đó một số cần cấu hình thêm. Rút ra: hướng dẫn trước, thiết bị được nhận vẫn cần kiểm tra. Không sử dụng các tuyên bố marketing về độ chân thực/khả năng bay thực làm bằng chứng cho UAV ARENA. Không mua, cài hoặc thử phần cứng của sản phẩm.

## Vấn đề quan sát được trong bản v0.2

Kiểm tra mã, ảnh cũ và trình duyệt sản xuất cho thấy tám workspace tiếng Anh ở cùng mức, nhiều chữ 9–12 px, vị trí người lái ở phía tây gần H, thông số gió dạng số và hiệu chỉnh tay điều khiển lộ sớm. Đây là nhận xét kiểm tra phần mềm của kỹ sư, không phải lỗi đã được học viên báo. Baseline thực tế: 32 test, build, 18 kiểm tra training và 13 kiểm tra reference đều pass. Pass kỹ thuật không chứng minh dễ sử dụng.

## Quy ước đề xuất và áp dụng

Trang đầu chỉ có Luyện tập, Thi thử, Xem lại bài bay, Cài đặt. Giảng viên có lối vào có nhãn rõ. Người mới có bốn bước, luôn có Bỏ qua hướng dẫn; lựa chọn bài bay và cách hiển thị được nhớ tại máy. Không lưu tên học viên như tùy chọn tiện dụng. Nút nguy hiểm khác Tạm dừng; hủy bài hoặc tắt lực đẩy khi đang trên không cần xác nhận và giữ bằng chứng. Không thêm âm thanh giả hoặc tùy chọn âm thanh chưa có chức năng.

Gió Không gió/Nhẹ/Trung bình/Mạnh ánh xạ vào mô hình hiện có. Chỉ dùng luyện tập, không là ngưỡng thời tiết được phép ngoài đời. Màn hình thi thử chỉ cho biết điều kiện do giảng viên chọn và khóa chúng. H là điểm máy bay, PILOT là vị trí người đứng ngoài V1. “Góc người lái” là một chế độ duy nhất, không có camera VLOS thứ hai.

## Giả định chưa được xác minh

Tiếng Việt hiện tại cần giảng viên bản địa và người học duyệt thuật ngữ. Chưa xác minh vị trí đứng/độ lùi/FOV 70°, độ nhận hướng ở xa, mức gió phù hợp giáo án, thiết bị USB, độ trễ, hiệu năng GPU hay khả năng chuyển kỹ năng. Không có dữ liệu cho rằng mọi học viên muốn bàn phím hoặc mọi người lớn tuổi cần cùng một cỡ chữ.

## Kế hoạch thử với người thật — PENDING

Mời tối thiểu 2 người mới, 2 người lớn tuổi với mức kinh nghiệm máy tính khác nhau, 2 giảng viên và 1 quản trị; đây là đợt khám phá định tính nhỏ, không ước lượng tỷ lệ toàn bộ người dùng. Xin đồng ý ghi chép; không ghi hình hoặc thông tin nhận dạng nếu không cần. Người điều phối nói rõ đang kiểm tra phần mềm, không chấm năng lực người tham gia.

Dùng máy lớp học thực ở 1366×768 và 1920×1080, chuột/bàn phím và RC đã kiểm tra riêng; đo màn hình và khoảng cách nhìn. Thực hiện hai vòng với sửa lỗi giữa hai vòng. Cho làm trước khi gợi ý, ghi đúng mức hỗ trợ. Khi mô phỏng lỗi kết nối, không cắm hoặc điều khiển UAV thật.

1. Mở ứng dụng và bắt đầu luyện tập; chọn Bay hình số 8.
2. Chọn Gió nhẹ; tìm và kiểm tra nguồn điều khiển.
3. Phân biệt H và PILOT, tìm Góc người lái, nhìn quanh và Nhìn thẳng.
4. Chuẩn bị, xác nhận trước bay, bật động cơ, bắt đầu, tạm dừng, tiếp tục và thử lại theo quy trình.
5. Hiểu lỗi chưa kết nối và chọn cách khắc phục.
6. Vào Thi thử, giải thích vì sao không đổi gió/camera; hoàn tất hoặc hủy đúng cách.
7. Tìm báo cáo, phân biệt điểm luyện tập với kết luận của giảng viên; mở phát lại.
8. Giảng viên đổi điều kiện cho bài sau, nhận xét và xuất báo cáo. Quản trị hiệu chỉnh một trục rồi kiểm tra hướng cần.

Ghi cho từng tác vụ: hoàn thành độc lập/có trợ giúp/không hoàn thành, thời gian, lần bấm sai/quay lại, trợ giúp, câu hỏi nguyên văn về từ khó, chữ khó đọc và nút khó tìm. Dùng thang dễ/khó 1–5 sau mỗi việc cùng một câu hỏi mở; không yêu cầu tính toán kỹ thuật. Không áp hạn thời gian thành thi trượt.

Mục tiêu sản phẩm sơ bộ: mọi người hiểu H/PILOT và điểm không phải chứng nhận; không ai vô tình xóa bản ghi hoặc ngừng lực đẩy do nhầm nút; đa số làm được luồng chọn bài–gió–thiết bị không cần gợi ý. Nếu không đạt, sửa và thử lại; không công bố “đã xác minh usability” chỉ nhờ tự động hóa. Lưu kết quả ẩn danh, phiên bản phần mềm, thiết bị và quyết định sửa ở lần thử thực tế.

## Task-centered iteration: walkthrough and pending human work

See [current audit](HUMAN_CENTERED_UX_AUDIT.md) and [implementation/evidence](HUMAN_CENTERED_UX_IMPLEMENTATION.md). The same participant plan now includes: enter an ID/exercise, close/reopen Bài bay, recover from missing USB controller using keyboard, set wind4/rain6 then reset, find prepare without scrolling unrelated groups, collapse/reopen panel, find pause versus emergency stop, locate H and explicitly turn to the far-right/high sector, disable the ground guide, and review an incomplete attempt. Measure time, wrong actions, requests for help and reading/terminology issues; do not assign success thresholds after seeing results. Actual Chrome Page zoom200% keyboard/input/slider/preflight behavior has an automated check, alongside equivalent CSS viewport/DPR emulation. Other browsers/OS zoom, screen reader and actual classroom keyboard/RC/display still need people/hardware. Neither walkthrough constitutes an actual participant study or full accessibility audit.
