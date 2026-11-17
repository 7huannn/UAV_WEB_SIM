# UAV ARENA — PHOTOREALISTIC WEB SIMULATOR

> **Bản đặc tả triển khai (single source of truth)**  
> Phiên bản: 1.0 · Ngôn ngữ: Tiếng Việt (giữ nguyên thuật ngữ kỹ thuật khi cần)  
> Trạng thái: Sẵn sàng cho coding agent triển khai. Ảnh sơ đồ gốc sẽ được chủ dự án cung cấp sau.  
> **MỤC TIÊU:** Xây dựng ứng dụng web 3D **chạy được** mô phỏng một **sân UAV bê tông hình chữ nhật** giữa bãi cỏ nhỏ ngoài trời, chất lượng hình ảnh **photorealistic**, thời tiết động và quadcopter có động lực học thực (6DOF / bốn motor / điều khiển PID / gió / va chạm).

---

## 0. ĐỌC PHẦN NÀY TRƯỚC — 10 QUY TẮC KHÔNG ĐƯỢC LÀM SAI

1. **CHỈ DỰNG PHẦN KHỐI SÂN CHỮ NHẬT CHÍNH 45 m × 27 m**, là **một sân BÊ TÔNG phẳng** với các vạch và khu chức năng **nằm bên trong khung sân**. Đây là khối trung tâm duy nhất cần tái dựng từ bản vẽ.
2. **Bên ngoài sân bê tông là CỎ XANH TỰ NHIÊN**; toàn cảnh mặt đất khoảng **60 m × 42 m**. Cỏ chỉ là phần bao quanh để tạo môi trường chân thực, không phải thêm một sân thi đấu thứ hai. Không cần làm bãi cỏ vô hạn.
3. **KHÔNG** dựng các khối/hạng mục phụ nằm ngoài sân: bàn giám khảo, khu thí sinh chờ, khu chuẩn bị, cấp cứu/PCCC, khán đài, hàng rào phức tạp, nhà cửa, thành phố, đường phố, Google Maps, biển hiệu, các nhãn văn bản của bản vẽ nằm bên ngoài hình chữ nhật.
4. **Không biến sân chính thành cỏ.** Sân chính là bê tông PBR nhìn như ảnh thật; cỏ bao ngoài có blade/tuft 3D gần camera và texture chất lượng cao. Không dùng một mặt phẳng xanh làm toàn bộ môi trường.
5. **Không nhầm các loại vạch:** V1 = đường bao ngoài 45 × 27 m; V2 = đường bao hành lang bay; V3 = tim đường bay nét đứt. Không tự khẳng định V2 là một hình chữ nhật 38 × 21 m khi chưa kiểm tra hình gốc.
6. **Đường bay số 8, các vòng tròn, vạch sơn, điểm H/HA/HB, marker và waypoint trong khối sân chính** phải bám theo ảnh tham chiếu; điểm nào thiếu dữ liệu phải đánh dấu là *ước lượng/chờ xác nhận*, không tự biến thành số đo chính thức.
7. **Đồ họa chân thực là yêu cầu bắt buộc:** vật liệu PBR, mặt bê tông có chi tiết, cỏ, ánh sáng, bóng đổ, mây/trời, sương/mưa và camera sát mặt đất vẫn thuyết phục. Không chấp nhận low-poly/cartoon/basic Three.js demo như sản phẩm hoàn tất.
8. **Physics không được “teleport” drone** bằng cách thay XYZ theo input. Mô phỏng lực đẩy từng rotor, mô-men, khối lượng/quán tính, trọng lực, lực cản và gió, tích phân 6DOF theo fixed timestep, điều khiển PID, mô phỏng va chạm thật với mặt đất.
9. **Weather và physics dùng chung trạng thái**: tăng tốc gió phải vừa làm cỏ/mưa thay đổi hướng, vừa tạo nhiễu lực thực lên drone để PID bù. Không chỉ làm hiệu ứng thị giác.
10. **Phải viết và chạy code thực, kiểm tra trong trình duyệt, chụp screenshot thật, chạy test, báo rõ phần nào hoàn chỉnh/phần nào chỉ là xấp xỉ.** Không chỉ giao kiến trúc, mockup hay lời hứa “giống Unreal”.

### 0.1 Phạm vi hình học — cách hiểu tuyệt đối

```
TOP-DOWN (MINH HỌA PHẠM VI, KHÔNG PHẢI BẢN VẼ TỶ LỆ)

        CỎ TỰ NHIÊN: 60m theo trục dài
┌────────────────────────────────────────────────────────────┐
│                         CỎ                                │
│      ┌──────────────────────────────────────────────┐      │
│      │             SÂN BÊ TÔNG 45 × 27m            │      │
│      │ V1 — vạch biên ngoài                        │      │
│      │   H / HA / HB   các vạch nội bộ             │      │
│      │         vòng số 8 + WP + V2 + V3            │      │
│      │       TẤT CẢ NẰM TRONG KHUNG CHÍNH         │      │
│      └──────────────────────────────────────────────┘      │
│                         CỎ                                │
└────────────────────────────────────────────────────────────┘
            chiều rộng tổng: ~42m
```

> **“Chỉ làm khối vuông”** trong trao đổi với chủ dự án có nghĩa là **chỉ tập trung vào khối sân chính được bao bởi hình chữ nhật V1**. Hình học thật **không phải hình vuông** vì có kích thước **45 × 27 m**. Những thứ nằm **trong V1** và phục vụ bài thi là nội dung hợp lệ; mọi cơ sở vật chất minh họa **ngoài V1** bị loại bỏ. Ngoại lệ duy nhất ngoài V1 là **nền cỏ bao quanh + bầu trời/khí quyển**, để đạt cảm giác thực tế.

---

## 1. BỐI CẢNH VÀ KẾT QUẢ MONG MUỐN

Ứng dụng dành cho người dùng mở website và thấy một **sân bay thử nghiệm/thi đấu UAV ngoài trời nhỏ** chứ không phải khu đô thị. Ở trung tâm là mặt sân bê tông chữ nhật có đường bay hình số 8 theo sơ đồ, xung quanh là bãi cỏ xanh chiều rộng vừa phải. Camera có thể bay sát mặt sân, zoom vào texture, đổi thời tiết, xem drone cất/hạ cánh, giữ vị trí khi gặp gió và theo dõi một đường bay minh họa trong sân.

Ba mục tiêu độc lập nhưng phải đồng bộ:

- **Visual realism:** chất lượng giống cảnh game mô phỏng môi trường ngoài trời, *tiệm cận chất lượng có thể tối ưu của Unreal trên GPU phù hợp*, không dùng ảnh tĩnh giả làm thế giới tương tác.
- **Physics credibility:** động lực học 6DOF theo lực/mô-men, motor và controller hợp lý, có tham số và cách kiểm chứng; **không tuyên bố chính xác như UAV thật nếu chưa hiệu chuẩn**.
- **Usable native web:** chạy trong browser từ project thông thường, tự xử lý input, camera, telemetry, weather; không phụ thuộc Unreal Pixel Streaming hoặc server GPU cho bản chính.

> Ảnh sơ đồ cung cấp **mặt bằng 2D**, không cung cấp ảnh chất liệu ngoài đời. Vì vậy môi trường chỉ có thể **photorealistic theo phong cách hiện trường** (bê tông/cỏ/bầu trời), **không thể cam kết giống một địa điểm GPS cụ thể**. Không cần geospatial photogrammetry, Cesium, Google 3D Tiles hoặc Google Maps trong giai đoạn này.

---

## 2. NGUỒN THAM CHIẾU VÀ QUY TẮC ĐỌC ẢNH

### 2.1 File tham chiếu

Chủ dự án sẽ đưa ảnh mặt bằng UAV sau. Khi nhận được, lưu ở:

`assets/reference/arena-layout.png`

Nếu ảnh bị xoay 90°, xoay **để xem cho đúng** (title nằm ngang, cạnh 45m nằm ngang); không làm thay đổi tỷ lệ kích thước thực. Lưu nguyên bản và nếu cần tạo một bản rotated để dev.

**Thứ tự ưu tiên thông tin:**

1. Kích thước/ghi chú có thể đọc được trực tiếp trong ảnh chính thức.
2. Các quy định phạm vi và chất liệu sân trong file này (**bê tông ở giữa, cỏ ngoài, chỉ V1**).
3. Suy luận hình học từ tỷ lệ pixel sau khi hiệu chuẩn theo cạnh 45m và 27m.
4. Các giá trị mặc định dùng tạm cho phần không được định nghĩa, phải ghi thành `assumption` và có thể sửa qua config.

**Không suy ra hình học cuối cùng từ hình ASCII minh họa bên trên.**

### 2.2 Thông số đọc từ sơ đồ đang có trong trao đổi

| Hạng mục | Giá trị/đọc hiểu | Độ chắc chắn |
|---|---|---|
| Sân bao ngoài V1 | **45m × 27m** | Rõ trong ảnh |
| Dải kích thước dọc/ngang bên trong | Có các số **38m, 35m, 32m** theo cạnh dài và **21m, 18m, 15m** theo cạnh ngắn | Rõ số, **chưa được phép gán sai cho một hình cụ thể** |
| Loại đường V1 | **Đường biên ngoài, rộng 5cm, màu trắng** | Ghi chú bản vẽ |
| Loại đường V2 | **Đường bao hành lang bay, rộng 10cm, màu trắng** | Ghi chú bản vẽ |
| Loại đường V3 | **Tim đường bay, nét đứt, rộng 10cm, màu vàng** | Ghi chú bản vẽ |
| Đường bay chính | Hình **số 8**, hai vòng và điểm giao giữa, các mũi tên hướng bay | Rõ bố cục |
| Các bán kính ở vùng vòng | **R4m, R5.5m, R7m** được ghi trên hình | Rõ nhãn, cần gắn đúng đường khi số hóa |
| Điểm mốc | **WP1, WP2, WP3, WP4** và **M1–M5**, nhãn M7 ở giao cắt | Rõ nhãn; cần xác minh vị trí theo ảnh |
| Độ cao mô tả | Một số mốc có **h5m** | Có trong nhãn; cần dùng đúng loại waypoint |
| H/HA/HB | Các điểm/vòng hạ cánh hoặc điểm chuẩn bị ở phía trái **bên trong V1** | Nhìn thấy trong ảnh |
| Vùng H trung tâm | Có chú thích **3m × 3m** | Nhìn thấy |
| UAV tham chiếu ở tiêu đề | UAV đa rotor **10–25kg, không bao gồm payload** | Chỉ là điều kiện bài thi, **không phải thông số drone mặc định đã hiệu chuẩn** |

**Lưu ý:** 38m × 21m xuất hiện dưới dạng kích thước các dải nội bộ; **không tự đồng nhất với toàn bộ V2**. Theo chú giải, V2 và V3 mô tả các **đường vạch**, không phải tên gọi cho khung chữ nhật thứ hai. Agent phải đối chiếu đường dẫn nhãn và kích thước trong ảnh trước khi đặt các vertex cuối cùng.

### 2.3 Cái gì thực sự nằm trên mặt sân?

- **Sơn vật lý lên bê tông:** V1, V2, V3, vòng/hình số 8, các khu H theo bản vẽ và bất kỳ vạch chỉ dẫn thực nào được xác định từ sơ đồ.
- **HUD/overlay trong chế độ kỹ thuật:** nhãn WP1–WP4, M1–M7, kích thước, mô tả độ cao; **không in những dòng chữ thuyết minh/bản vẽ khổng lồ lên bê tông** trừ khi đó là dấu hiệu sơn thật.
- **Mũi tên:** nếu là ký hiệu hướng bay từ bản vẽ, nên là route overlay hoặc decal có thể bật/tắt, không phải vật cản nổi.
- **HA/HB/H nằm trong V1:** thể hiện bằng vòng/symbol sơn theo ảnh, không dựng khu chuẩn bị hay tòa nhà phụ bên ngoài.
- **Không được tự thêm cọc, tường, rào, khán đài, chướng ngại vật nguy hiểm để “trông đầy đủ hơn”.** Nếu sau này có vật cản, phải được chủ dự án bổ sung vào scope.

---

## 3. QUY MÔ VÀ HỆ TỌA ĐỘ

### 3.1 Mặc định

```ts
export const arenaConfig = {
  ground: { lengthM: 60, widthM: 42, surface: 'natural-grass' },
  concrete: { lengthM: 45, widthM: 27, center: [0, 0, 0] },
  v1: { lengthM: 45, widthM: 27, lineWidthM: 0.05, color: '#f5f5f1' },
  v2: { lineWidthM: 0.10, color: '#f5f5f1' },
  v3: { lineWidthM: 0.10, color: '#dfbe39', dashed: true },
  waypointLayout: 'derive-from-reference-image',
} as const;
```

- Dùng hệ thế giới: **X dọc cạnh 45m**, **Z dọc cạnh 27m**, **Y hướng lên** (mét).
- Tâm sân bê tông = `(0, 0, 0)` trên bề mặt, dải X `[-22.5, 22.5]`, Z `[-13.5, 13.5]`.
- Mặt cỏ tổng X `[-30, 30]`, Z `[-21, 21]`, tạo bề rộng cỏ **7.5m bốn phía** khi căn giữa.
- Bê tông không cao quá mức vô lý. Có thể đặt cao hơn nền cỏ rất nhẹ (ví dụ 2–5cm, là giá trị **thiết kế giả định**), có viền tiếp giáp tự nhiên, không có bậc cao nguy hiểm nếu chưa được yêu cầu.
- Dùng **quaternion** cho orientation; quy ước tọa độ/rotation/velocity phải được mô tả duy nhất, rõ ràng khi giao tiếp với physics.
- Không cần GPS, WGS84/ENU cho bài toán **mặt sân nhỏ không định vị địa lý thật**. Nếu sau này yêu cầu GPS thì bổ sung hệ quy đổi riêng; không lấy GPS làm điều kiện tiên quyết của rendering/physics.

### 3.2 Số hóa layout có chứng cứ

- Số hóa vertex/spline của đường theo ảnh, **định cỡ bằng 45m/27m**, không đoán chung chung “trông giống số 8”.
- Dùng splines/curves với hệ tọa độ mét; các đoạn rẽ/vòng có thể xuất ra dữ liệu và hiển thị top-down.
- Đường kẻ có độ rộng **thực** (5cm/10cm), xử lý decal/z-fighting, miter joins, dashes theo quy chuẩn.
- Tách `arenaGeometry.json` (điểm, cung, vùng sơn) khỏi code render để có thể hiệu chỉnh dễ.
- Nếu một con số không rõ là chiều dài của đoạn nào, lập `ASSUMPTIONS.md` hoặc section README giải thích, không hợp thức hóa số đo tùy ý.

---

## 4. CHẤT LƯỢNG HÌNH ẢNH — ƯU TIÊN CAO NHẤT

### 4.1 Định nghĩa “real”

Mục tiêu là **photorealistic outdoor small environment**, không phải photogrammetry của một vị trí thật hay render offline. Kết quả phải thuyết phục từ 3 góc:

1. **Toàn cảnh từ trên cao:** nhìn rõ sân bê tông chữ nhật ở giữa thảm cỏ không quá lớn, vạch số 8, trời/ánh sáng đồng nhất.
2. **Góc người đứng/sát mặt sân:** cỏ có texture/geometry thật, bê tông có roughness, lấm tấm/đường nối/loang nhẹ, không lộ texture lặp và shader giả.
3. **Chạy theo drone/FPV:** thấy scale đúng, bóng drone chính xác, ánh sáng/độ tương phản hợp lý khi chuyển qua các thời tiết.

Tuyệt đối tránh: nền xanh phẳng, cỏ dạng tam giác hàng loạt, bê tông một màu xám sạch bóng vô lý, đường sơn quá dày như đường game, mây phẳng giả, ánh sáng quá cháy, bloom quá tay, hình drone tỷ lệ sai.

### 4.2 Bê tông (trung tâm)

- Sử dụng **licensed high-quality PBR textures**: albedo, normal, roughness, có thể AO/height tùy thiết kế.
- Chất bê tông ngoài trời đã sử dụng: hạt cốt liệu mịn, thay đổi sắc độ ít, vết bẩn nhẹ, rêu/loang rất ít ở mép; không biến thành đường nhựa/asphalt.
- Texture tile hợp lý theo mét; kết hợp macro variation để không lộ lặp từ trên cao.
- Đường nối hoặc nứt nhỏ **rất tiết chế**, không phá tính phẳng/sạch của sân thi đấu.
- Vạch sơn vật liệu riêng, có độ nhám/phản xạ và mép sơn nhẹ; đúng chiều rộng quy chuẩn.
- Khi ướt: tối bê tông, roughness giảm phù hợp, reflection/specular tăng; vũng nước nhỏ **chỉ là chi tiết quang học**, không dựng mặt hồ che sân.

### 4.3 Cỏ bao quanh

- Nền cỏ dùng texture PBR; thêm instanced grass blades/clumps gần camera.
- Cỏ thay đổi height, hue, clump, mật độ, hướng nghiêng; bố cục tự nhiên nhưng **không che mất vạch V1 hoặc mọc xuyên bê tông**.
- Gió tạo shader bending mượt; cỏ ở xa dùng LOD/fade để giảm draw calls.
- Cỏ xanh vừa phải, không neon/saturated; có một ít cỏ khô để tăng tính tự nhiên.
- Có transition giữa mép bê tông và thảm cỏ, nhưng **không tạo cỏ tràn lên sân**.
- Không dựng thêm đường nội bộ, phố, rừng hoặc ngọn núi lớn làm lạc trọng tâm.

### 4.4 Sky, clouds, sunlight, shadow, atmosphere

- Sky model có cảm giác khí quyển thực; bầu trời xanh với gradient và haze theo góc nhìn.
- Sun directional light, color temperature tương thích thời gian trong ngày.
- Real-time shadows đủ chi tiết: chân drone, mép vật thể; shadow bias/cascades/contact shadows nếu phù hợp.
- Clouds hình thể mềm mại, không làm bằng vài tấm texture lộ hình; thay đổi độ che phủ và chuyển động theo gió.
- Ambient/environment illumination, tone mapping, color space nhất quán; xử lý sương mù chân thực.
- Cho phép chỉnh **time of day** (ngày/góc sáng) mà không biến scene thành quá tối đến mức không thao tác được.
- Không thêm building/cityscape vào đường chân trời; có thể dùng sky/haze và một biên thiên nhiên tối giản.

### 4.5 Asset và license

- Ưu tiên asset có quyền sử dụng rõ ràng (CC0/public domain/giấy phép tương thích), ghi nguồn vào `ASSET_LICENSES.md`.
- Nếu tải asset không được, ghi rõ thiếu asset và nêu cách thay thế; **không chấm bản placeholder là đã đạt photorealism**.
- Nén ảnh KTX2/Basis khi cần, mipmaps, quản lý độ phân giải. Không tải 8K cho mọi bề mặt vô điều kiện.
- Không giả lập chất lượng Unreal bằng screenshot, ảnh nền video hoặc video pre-render. **Phải là hình 3D interactive render thật**.

---

## 5. THỜI TIẾT ĐỘNG: HÌNH ẢNH & TÁC ĐỘNG

### 5.1 Preset

- `Clear / Sunny`
- `Partly Cloudy`
- `Overcast`
- `Light Rain`
- `Heavy Rain`
- `Windy / Gusts`

Có thể chuyển thời tiết trong lúc drone đang bay. Nên blend dần sky/light/wetness để tránh giật trạng thái.

### 5.2 Param giao diện

| Tham số | Đơn vị | Ghi chú |
|---|---|---|
| Wind speed | m/s | Có thể chỉnh bằng slider |
| Wind direction | độ (°) | Ghi rõ **gió thổi từ** hay **hướng tới**; không mơ hồ |
| Gust strength | m/s hoặc hệ số | Phân biệt với mean wind |
| Turbulence | hệ số | Có seed để tái lập test |
| Cloud coverage | 0–1 | Ảnh hưởng sunlight và shadow |
| Rain intensity | 0–1 hoặc mm/h | Ghi rõ convention |
| Fog/visibility | m | Fog của scene; không cam kết khí tượng thực tế |
| Time of day | giờ | Thay đổi góc và màu ánh sáng |

### 5.3 Weather rendering

- Mưa 3D dạng GPU particles/instanced geometry hợp lý, khoảng cách/vận tốc hạt nhìn tự nhiên. Không để hạt mưa to như tuyết.
- Rain slant theo hướng gió, giảm visibility khi heavy rain.
- Bê tông ướt dần, mưa tích hợp với vật liệu ground; cỏ tối hơn khi ướt; puddles rất nhẹ, optional.
- Mây trôi với vector gió tương thích; sun/ambient/shadow respond theo cloud coverage.
- Hiệu ứng phải đẹp cả top-down, follow camera và ground-level.

### 5.4 Weather physics

- Chia sẻ `WeatherState` giữa renderer và physics, không dùng 2 nguồn ngẫu nhiên bất đồng.
- Gió ảnh hưởng **relative air velocity** và lực khí động của drone; có turbulence/gust disturbance, có seed/timestamp để debug.
- Controller có thể bù gió; thay wind speed phải thấy drift/tilt/compensation trong telemetry.
- **Mưa chỉ ảnh hưởng thị giác theo mặc định.** Không giả vờ đã mô phỏng tác động giọt nước lên động cơ, pin, IMU hay sensor nếu chưa có model được chứng minh. Những hiệu ứng đó là extension riêng.

---

## 6. MÔ PHỎNG DRONE — KHÔNG ĐƯỢC DÙNG ANIMATION BAY GIẢ

### 6.1 Dynamics 6DOF

Mô phỏng state tối thiểu:

- Position `(x,y,z)` (m), linear velocity (m/s).
- Quaternion orientation và angular velocity (rad/s).
- Khối lượng (kg), moment of inertia tensor (kg·m²), trọng lực.
- Lực và mô-men tổng; thrust, rotor reaction torque, drag và wind disturbance.
- Model có tham số được cấu hình trong JSON/TS, không hardcode tản mác trong React components.

**Không** cập nhật vị trí trực tiếp `position += key * speed * dt` như game arcade và gọi đó là drone physics.

### 6.2 Bốn motor

- Mỗi motor có state RPM/angular speed, spin direction, min/max range, lag/time constant, thrust coefficient, torque coefficient.
- Tổng lực đẩy liên hệ với tốc độ rotor và cấu hình drone; dùng model vật lý đơn giản có giải thích rõ giới hạn.
- Rotor thrust/torque tạo ra chuyển động 6DOF qua numerical integration.
- Propeller render quay theo **motor state thực**, không quay số cố định độc lập.
- Cần xử lý motor saturation, arm/disarm và shutdown khi disarm/land theo state machine nhất quán.

### 6.3 Controller

- Cascaded controller gồm position/velocity -> attitude -> body rates -> motor mixing.
- Hỗ trợ ổn định hover, giữ cao độ, điều khiển thủ công, takeoff, land.
- PID cần giới hạn output, anti-windup phù hợp, tránh điều khiển bùng nổ khi saturate/đổi mode.
- Khi wind gust, drone có hành vi vật lý hợp lý và bộ điều khiển bù; không lập trình “nudge” trực tiếp position để trông đẹp.
- Đường bay tự động là **một chức năng mô phỏng trong sân**; sử dụng waypoint trong diagram sau khi số hóa và có thể bật/tắt overlay. Không mở rộng sang hoạt động ngoài khu vực nhỏ này.

### 6.4 Drone model và cảm biến

- Model quadcopter high quality (GLB/glTF) có tỷ lệ thực: frame, 4 arms, motors/propellers, landing gear, optional FPV lens; PBR materials.
- Có sẵn preset tham số UAV mẫu để demo (nêu rõ *illustrative*), configurable mass/inertia/motor coefficients; **ảnh sơ đồ không xác định một mẫu UAV cụ thể**.
- Nếu mô phỏng IMU, GPS, camera: định nghĩa output, noise, coordinate/frame conventions và giới hạn. Camera FPV lấy từ render; telemetry không được giả là dữ liệu cảm biến đo thật.
- Không khẳng định đây là mô hình engineering-grade hay “digital twin” nếu chưa được hiệu chuẩn/validate bằng dữ liệu flight log hoặc bench test.

### 6.5 Numerical stability và thời gian

- Physics fixed timestep, ví dụ bắt đầu ở **250 Hz** nếu hiệu năng cho phép (configurable), **không chạy theo FPS**.
- Controller có tần số cố định riêng (configurable); renderer 30–60+ FPS tùy GPU; dùng interpolation/extrapolation giới hạn để mượt.
- Xử lý pause, resume, reset, tab inactive, dt spike, throttle browser; tránh tích lũy simulation step vô hạn sau khi tab bị ẩn.
- Tách `simulationTime` khỏi wall-clock time và hỗ trợ deterministic seeded gust cho bài kiểm tra.
- Có thể chuyển dynamics sang Worker/WASM nếu profiler cho thấy cần; không bắt buộc dùng WASM ngay nếu TypeScript fixed-step đạt mục tiêu.

---

## 7. COLLISION WORLD ĐỘC LẬP VỚI VISUAL WORLD

**Luôn tách hai lớp** dù ở cảnh sân đơn giản:

| Visual scene | Collision scene |
|---|---|
| Bê tông PBR chi tiết, vết bẩn, vạch sơn | Mặt phẳng/ground collider đúng độ cao |
| Grass mesh, shader bend, macro texture | Ground collider đơn giản phù hợp nếu có tiếp xúc |
| Drone GLB đẹp, propeller | Drone collider ở cấu hình tương ứng |
| Rain/sky/fog/lighting | **Không** tạo collider cho mưa/mây/vạch sơn |

- Geometry/collision cùng tọa độ mét và transform.
- Drone không xuyên nền, có ground contact và landing detection hợp lý.
- Collider không làm máy bay bật vô lý; thiết lập restitution/friction hợp lý, test tại các vận tốc hạ cánh an toàn của mô phỏng.
- Sơn vạch không nhô lên như tường. Mặt bê tông/phần cỏ không được lệch mặt collider gây cảm giác drone lơ lửng.
- Có debug overlay để nhìn collider khi phát triển (ẩn mặc định).

**Rapier có thể giải quyết tiếp xúc/va chạm nhưng không tự tạo quadrotor thrust, motor response hay PID.** Cần một `DroneDynamics` module riêng, tránh double integration hoặc xung đột hai physics engines.

---

## 8. CAMERA, TƯƠNG TÁC VÀ TELEMETRY

### 8.1 Camera modes

1. **Cinematic default:** góc nhìn chéo từ trên cao vào khối sân bê tông ở giữa bãi cỏ; nhìn nhận ngay bố cục **cỏ ngoài, bê tông giữa**.
2. **Orbit/free:** orbit/pan/zoom, giới hạn camera không xuyên mặt sân; camera đi sát cỏ vẫn nhìn đẹp.
3. **Follow:** mềm và mượt, nhìn rõ drone và hướng bay.
4. **FPV:** camera gắn drone theo roll/pitch/yaw, tùy chọn FOV và stabilization.
5. **Top-down:** nhìn vuông góc để kiểm tra vạch V1, V2, V3 và đường số 8; có chế độ scale/measurement.

### 8.2 Điều khiển

- Arm/disarm, takeoff, land, hover, reset simulation.
- Manual input có mô tả rõ: phím/trục điều khiển **command** (velocity/attitude/throttle) qua controller, không điều khiển trực tiếp position.
- Figure-eight mission: load waypoint/path sau khi có ảnh layout chính thức; Start/Pause/Stop và path visualization.
- Weather preset/sliders, camera switch, graphics quality presets, show/hide route labels và collision debug overlay.

### 8.3 Telemetry

- Position/meters, altitude, linear velocity, angular rates, roll/pitch/yaw.
- 4 motor RPM/speed/thrust (đơn vị rõ), flight mode, controller outputs tối thiểu.
- Wind vector/strength/gust, rain/cloud state.
- Frame FPS, physics step rate/lag; báo khi simulation giảm fidelity.
- Có option biểu đồ time-series cho drift/altitude/attitude nếu không làm nặng scene.

---

## 9. STACK ĐỀ XUẤT, CẤU TRÚC CODE

### 9.1 Stack baseline

- **Vite + React + TypeScript**.
- **Three.js + @react-three/fiber + @react-three/drei** cho render & camera.
- **PBR materials, instanced grass, shaders** (GLSL) & postprocessing có giới hạn.
- **Rapier** làm collision nếu tích hợp hợp lý, hoặc collider plane đơn giản có test rõ.
- **Quadrotor dynamics** riêng ở TypeScript trước, sau đó cân nhắc WASM/Worker nếu cần.
- **Native browser WebGL2** là baseline; WebGPU là tùy chọn, không được dùng làm điều kiện bắt buộc.
- **Không** yêu cầu Unreal Engine server, Pixel Streaming, MATLAB license, Cesium, Google API hoặc server GPU chỉ để mở demo.

### 9.2 Cấu trúc gợi ý

```text
uav-arena/
├── assets/
│   ├── reference/arena-layout.png       # Người dùng sẽ gửi sau
│   ├── textures/                         # Licensed PBR concrete/grass
│   └── models/                           # Licensed GLB quadcopter
├── src/
│   ├── app/                               # React UI & main scene
│   ├── scene/                             # Lighting, atmosphere, terrain, decals
│   ├── arena/                             # Real-meter geometry, V1/V2/V3, H, WP
│   ├── weather/                           # WeatherState, cloud/rain/wind visuals
│   ├── drone/                             # Visual mesh & rotors
│   ├── simulation/                        # 6DOF dynamics, motors, controller
│   ├── collisions/                        # Colliders & debug
│   ├── cameras/                           # Follow/FPV/Orbit/Top-down
│   ├── ui/                                # Controls & telemetry
│   ├── config/                            # Scale, physics, weather presets
│   └── tests/                             # Unit/integration tests
├── docs/                                  # Assumptions, validation, screenshots
├── ASSET_LICENSES.md
├── README.md
├── package.json
└── vite.config.ts
```

### 9.3 Performance

- Nhắm mục tiêu ~60 FPS trên desktop GPU phù hợp, không hứa chắc 60 FPS trên mọi phần cứng.
- GPU instancing cho cỏ, distance fading/LOD, texture compression và mipmaps.
- Rain particles và shadow quality theo 4 preset `Low`, `Medium`, `High`, `Ultra`.
- Responsive canvas + UI; mức Low nên khả dụng trên máy yếu dù giảm hình đẹp.
- Tránh hàng ngàn React component grass riêng và không đọc React state mỗi frame cho physics.
- Profile FPS/frame time/VRAM/physics timing trên browser thật, không báo performance dựa trên cảm giác.

---

## 10. LỘ TRÌNH TRIỂN KHAI BẮT BUỘC

### Phase A — Visual world trước

- Scaffold Vite/React/TS, chạy được trong browser.
- Dựng **duy nhất sân bê tông 45 × 27m nằm giữa mặt cỏ 60 × 42m**.
- Tạo texture PBR chất lượng tốt, mép bê tông/cỏ, cỏ instancing, sky/haze/cloud, sun/ambient/shadows.
- Default camera chéo từ trên cao, top-down, ground-level.
- **Chụp 3 screenshot thật từ browser:** aerial, ground-level closeup, follow dummy camera/hero drone static.
- Tự đánh giá screenshot và sửa nếu còn low-poly/trông giả, trước khi tuyên bố Phase A hoàn tất.

### Phase B — Accurate arena markings

- **Sau khi nhận ảnh gốc**: xoay đúng chiều, số hóa các đường theo số đo, V1/V2/V3, vòng số 8, H, WP và label overlays.
- Kiểm tra góc top-down với ảnh reference; nêu sai số/assumptions.
- Không tạo 3D các hộp text hoặc phụ kiện nằm ngoài V1.

### Phase C — Weather

- UI presets và visual rain/cloud/wetness/fog/wind-driven grass.
- Một `WeatherState`, có chế độ chuyển preset mượt.
- Ảnh minh chứng ít nhất sunny/overcast/rain từ **chính ứng dụng**.

### Phase D — Physics & control

- Drone GLB có tỷ lệ hợp lý; dynamics 6DOF, motor 4, PID, gravity/drag/wind, fixed timestep.
- Takeoff/hover/land/manual, motor rendering theo physics state, collision ground.
- Thử `no wind` và `wind gust`, so sánh telemetry và mô tả reaction.

### Phase E — Mission, validation, optimization

- Waypoint figure-eight dựa đúng vào layout ảnh; điều khiển tự động trong phạm vi sân.
- Camera modes, telemetry, UI hoàn chỉnh.
- Test, profiler, quality presets, README, ASSET_LICENSES và báo cáo giới hạn.

**Nếu ảnh sơ đồ chưa được đưa cho agent:** agent **được bắt đầu Phase A, cấu trúc project, shader/material, weather scaffold và physics độc lập**; **không được chế tác đường số 8 cuối cùng bằng các tọa độ tưởng tượng**. Để trống/placeholder có ghi rõ là tạm, sau khi nhận ảnh phải hoàn chỉnh Phase B. Không coi dự án hoàn thành nếu thiếu ảnh hoặc chưa dựng chính xác layout.

---

## 11. TEST VÀ TIÊU CHÍ NGHIỆM THU

### 11.1 Tính đúng của scope/geometry

- [ ] Chỉ có **một khối sân bê tông trung tâm**; kích thước **45 × 27 m** đo trực tiếp bằng code.
- [ ] Nền bao ngoài là cỏ khoảng **60 × 42 m**, margin 7.5m mỗi phía nếu căn giữa.
- [ ] Không có bàn giám khảo, khu chờ, cấp cứu/PCCC, nhà cửa, đường phố hoặc công trình phụ ngoài V1.
- [ ] Có đủ vạch/khu trong V1 theo ảnh và có top-down để đối chiếu.
- [ ] V1 sơn trắng 5cm; V2 trắng 10cm; V3 vàng nét đứt 10cm theo ảnh.
- [ ] Không nhầm tên V2/V3 hay coi các số 38/35/32/21/18/15 là một loại hình học chưa kiểm chứng.
- [ ] Từng đồ họa cần giữ meter-scale, drone và sân cùng tỉ lệ.

### 11.2 Visual quality

- [ ] Không dùng flat green floor cho grass, không dùng bê tông 1 màu trống trơn.
- [ ] Nhìn sát cỏ vẫn có chi tiết, không lộ pattern thô hoặc billboard lặp.
- [ ] Bê tông có albedo/normal/roughness, macro variation; sơn không z-fight.
- [ ] Ánh sáng/bóng drone/sun/sky/haze nhất quán.
- [ ] Có screenshot từ app thật ở aerial, near-ground, drone-follow/FPV.
- [ ] Có sunny, cloudy, rainy screenshots, trên cùng sân.
- [ ] Nếu asset chất lượng cao chưa có, nêu rõ **Visual QA chưa pass**, không tự ghi hoàn thành.

### 11.3 Simulation

- [ ] Không gán trực tiếp XYZ để giả bay trong các flight modes.
- [ ] Có dynamics 6DOF và bốn motor state độc lập.
- [ ] Khi disarm/zero thrust, drone không có khả năng hover vô lý.
- [ ] Khi có thrust cân bằng hợp lệ, flight controller có thể hover trong điều kiện mô phỏng quy định.
- [ ] Gust tạo drift/tilt/response từ dynamics, controller thực hiện bù; không animate trực tiếp vị trí.
- [ ] Ground collider không cho drone xuyên bê tông; vạch sơn không cản drone.
- [ ] Motor visuals bám theo RPM trạng thái; telemetry theo dõi được.
- [ ] Physics ổn định và không phụ thuộc rendering FPS, có deterministic/reset tests.
- [ ] Tham số máy bay được ghi rõ là giả định hay hiệu chuẩn; không khẳng định equivalence với UAV thực nếu chưa có dữ liệu.

### 11.4 Delivery

- [ ] `npm install && npm run dev` hoạt động (hoặc câu lệnh tương đương được ghi rõ).
- [ ] Code đầy đủ trong repo, không chỉ pseudocode hoặc snippet.
- [ ] `npm run build` thành công và các test quan trọng pass.
- [ ] Tài nguyên có license/source rõ trong `ASSET_LICENSES.md`.
- [ ] README có run commands, keyboard controls, coordinate conventions, screenshot, hạn chế, đã/đang làm.
- [ ] Có logs/screenshot chứng minh chạy trên browser và ghi rõ thiết bị/GPU nếu công bố FPS.

---

## 12. QA CHI TIẾT CHO CODING AGENT

Phải thực hiện **triển khai → chạy → quan sát → sửa** chứ không chỉ sửa code theo suy đoán. Nếu môi trường có browser automation/Playwright hoặc screenshot tool, hãy sử dụng để chụp thực tế.

**Ảnh bắt buộc:**

1. `aerial-clear.png`: nhìn trọn sân bê tông 45 × 27 m nằm giữa cỏ; không có cơ sở phụ.
2. `ground-concrete-detail.png`: camera gần mặt sân bê tông và mép cỏ để chứng minh texture/transition.
3. `grass-closeup.png`: texture + blades cỏ có chiều sâu, không primitive-looking.
4. `rain-overcast.png`: mưa và wet material nhìn rõ, giữ đúng hình học.
5. `drone-flight.png`: drone có bóng và tỉ lệ thực so với sân.

**Tests gợi ý:**

- Geometry: bounding box đúng kích thước, painted line widths, route within V1.
- Simulation: gravity zero-thrust, thrust symmetry, motor state bounds, controller hover sanity, disturbance response, same result with same seed/time inputs.
- Browser: render không exception, UI controls thay đổi đúng weather, camera và telemetry.
- Visual QA: không thể tự động khẳng định “photorealistic”; agent phải xem screenshot và ghi nhận hạn chế còn lại, không báo pass chỉ vì shader chạy.

---

## 13. KHÔNG LÀM — OUT OF SCOPE

- Photogrammetry, lấy bản đồ đô thị thật, GPS terrain streaming, Cesium / Google Maps.
- Mô phỏng sân đấu diện tích hàng hecta, cánh đồng vô hạn, sân vận động/các cơ sở phụ nằm ngoài V1.
- Thêm kiến trúc, đèn đường, cây lớn che khuất, hàng rào, xe cộ để trang trí.
- Xây dựng sân chính toàn cỏ hoặc sân chính nhựa đường khi yêu cầu là bê tông.
- Dùng image/video as 3D world; dùng low-poly basic demo và tự nhận hoàn thành.
- Tự giả định rằng model là UAV thật 10–25kg đã hiệu chuẩn; hoặc tự ý gán kích thước UAV khi chưa có thông số.
- Các cơ chế vũ khí hóa, nhắm mục tiêu, tải trọng tấn công, hoặc mô phỏng nhiệm vụ ngoài sân.
- Tích hợp Unreal Pixel Streaming/backend GPU bắt buộc cho bản web-native này.

---

## 14. HƯỚNG DẪN BÀN GIAO CHO AGENT

Khi bắt đầu làm, agent phải:

1. Đọc **toàn bộ tài liệu này**, đặc biệt các mục **0, 2, 10, 11**.
2. Kiểm tra repo và tạo todo theo Phase A–E.
3. Nếu đã có ảnh trong `assets/reference/arena-layout.png`, đọc và xoay cho dễ tham chiếu; nếu chưa có thì **bắt đầu dựng khung sân + material + sky/grass** và giữ đường bay chi tiết ở trạng thái pending reference.
4. Tạo project thực, cài dependencies, code sạch, tách physics/render/weather/UI.
5. Chạy lệnh build/test và mở browser (nếu có công cụ) để kiểm tra ảnh thật.
6. Bàn giao code, README, hình kết quả, nguồn asset và danh sách limitations/assumptions.

### Điều kiện không được tuyên bố hoàn tất

Không được tuyên bố đã làm xong toàn bộ đặc tả nếu chỉ dựng được cỏ phẳng+bê tông phẳng, chưa có mô phỏng lực/motor thật, chưa có weather đồng bộ, hoặc chưa có ảnh để đối chiếu layout số 8. Nếu phần nào chưa làm, ghi tiến độ trung thực và tiếp tục ưu tiên các phần còn thiếu.

---

## 15. TÓM TẮT QUYẾT ĐỊNH ĐÃ CHỐT VỚI CHỦ DỰ ÁN

| Câu hỏi | Quyết định |
|---|---|
| Xây thành phố hay sân nhỏ? | **Sân nhỏ**, không thành phố |
| Bao nhiêu mặt bằng? | Cỏ ~**60 × 42 m**, bê tông **45 × 27 m** |
| Trung tâm là gì? | **MỘT SÂN BÊ TÔNG HÌNH CHỮ NHẬT** |
| Bên ngoài là gì? | **CỎ THẬT, MẢNG BAO QUANH NHỎ** |
| Có dựng khu khán giả/giám khảo/khu chờ? | **KHÔNG** |
| Có theo sơ đồ đường bay không? | **CÓ**, nội dung trong V1, sau khi nhận ảnh |
| Hình ảnh cần mức nào? | **Photorealistic real-time**, không cartoon/low-poly |
| Có thời tiết? | **Có**: trời/mây/nắng/mưa/sương, wet ground |
| Có gió thật? | **Có**: gió làm cỏ/mưa chuyển động **và** tác động physics drone |
| Physics drone? | **6DOF + 4 motor + thrust/torque/inertia/drag + PID + collisions** |
| Render ở đâu? | **Trình duyệt**, không cần Unreal server |
| Cần GPS map thật? | **Không**; map dựng từ sơ đồ và asset PBR |
| Ảnh reference khi nào? | **Chủ dự án sẽ gửi sau; không bịa route khi chưa có** |

**DONE có nghĩa là một simulator web 3D chạy thật, nhìn đủ chân thực, đúng khối sân, đúng phạm vi, có weather và flight physics có thể kiểm tra — không phải một trang demo mô tả ý tưởng.**
