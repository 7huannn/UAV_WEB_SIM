import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
const base = process.env.UAV_URL ?? 'http://127.0.0.1:4175';
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH ?? '/usr/bin/google-chrome', args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page = await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:1});
page.setDefaultTimeout(30000);
const errors=[], checks=[], screenshots=[], positions=[];
page.on('pageerror', e=>errors.push(String(e)));
page.on('console', m=>{if(m.type()==='error') errors.push(m.text());});
page.on('requestfailed', r=>errors.push(r.url()+': '+r.failure()?.errorText));
page.on('dialog', d=>d.accept());
await mkdir('docs/task-ux-screenshots',{recursive:true});
const button = name=>page.getByRole('button',{name,exact:true});
const group = name=>page.locator('.task-group').filter({has:page.locator('summary>b',{hasText:new RegExp('^'+name+'$')})});
async function open(name, value=true) {const g=group(name);if(((await g.getAttribute('open'))!==null)!==value) await g.locator(':scope>summary').click();}
async function frames(){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
async function capture(name){await frames();await page.screenshot({path:`docs/task-ux-screenshots/${name}.png`,fullPage:true});screenshots.push(name);console.log('Captured',name);}
async function nav(name){await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();await frames();}
async function overflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
async function flyTo(target){
  // Synthetic velocity commands through the unchanged force integrator. Never assigns aircraft XYZ.
  await page.evaluate(target=>{
    const w=window.__UAV__, d=w.drone;
    d.paused=false;
    if(!d.armed) {d.arm();d.engageManual();}
    const command=d.position.clone();
    for(let i=0;i<30000;i++){
      command.set(...target).sub(d.position).multiplyScalar(.7).clampLength(0,1.6);
      if(command.length()<.025 && d.velocity.length()<.04) break;
      d.manual(command,0,.004);d.advance(.004);
    }
    d.manual(command.set(0,0,0),0,.004);d.paused=true;
  },target);
  await frames();
  const p=await page.evaluate(()=>window.__UAV__.drone.position.toArray());
  assert.ok(Math.hypot(...p.map((n,i)=>n-target[i]))<.15,`${p} vs ${target}`);
}
async function metric(label){
  const m=await page.evaluate(()=>{
    const w=window.__UAV__, model=w.loadedAirframe??w.airframe.group, p=model.position.clone(), ground=w.groundGuide.group.children[1].position;
    const screen=p.clone().project(w.camera), a=p.clone(), b=p.clone();a.y-=.5;b.y+=.5;a.project(w.camera);b.project(w.camera);
    return {position:p.toArray(),eye:w.camera.position.toArray(),fov:w.camera.fov,zoom:w.camera.zoom,scale:model.scale.toArray(),ndc:screen.toArray(),pixelHeight:Math.abs(b.y-a.y)*w.renderer.domElement.clientHeight/2,guide:w.groundGuide.group.visible,ground:ground.toArray(),q:w.camera.quaternion.toArray()};
  });
  positions.push({label,...m});return m;
}
try {
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.__UAV__&&!window.__UAV__.stats.loading);
  const bundle=await page.locator('script[type=module]').getAttribute('src');
  await capture('home');await nav('Luyện tập');
  if(await button('Bỏ qua hướng dẫn').isVisible()) await button('Bỏ qua hướng dẫn').click();
  assert.equal(await page.locator('.preparation-groups .task-group[open]').count(),1);
  await page.getByLabel('Tên hoặc mã học viên',{exact:true}).fill('Học viên kiểm tra bàn phím');
  await page.getByLabel('Chọn bài bay',{exact:true}).selectOption('foundations');
  await capture('exercise-expanded');
  const summary=group('Bài bay').locator(':scope>summary');await summary.focus();await page.keyboard.press('Space');
  assert.equal(await group('Bài bay').getAttribute('open'),null);
  await capture('groups-collapsed');await page.keyboard.press('Enter');
  assert.equal(await page.getByLabel('Tên hoặc mã học viên',{exact:true}).inputValue(),'Học viên kiểm tra bàn phím');
  assert.equal(await page.getByLabel('Chọn bài bay',{exact:true}).inputValue(),'foundations');
  await button('Tiếp tục: kiểm tra điều khiển').click();
  assert.equal(await group('Bài bay').getAttribute('open'),null);
  assert.notEqual(await group('Thiết bị điều khiển').getAttribute('open'),null);
  checks.push('Task groups support Space/Enter, independent collapse, retained values, summaries and contextual progression');
  await button('Dùng tay điều khiển').click();await frames();assert.ok(await button('Chuẩn bị bài bay').isDisabled());
  await button('Dùng bàn phím').click();await frames();assert.ok(await button('Chuẩn bị bài bay').isEnabled());
  await open('Thiết bị điều khiển',false);await open('Điều kiện bay');
  const wind=page.getByLabel('Mức gió',{exact:true});await wind.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
  assert.equal(await wind.inputValue(),'1');assert.equal(await page.evaluate(()=>window.__UAV__.weather.target.wind),.9);
  await wind.fill('4');await page.getByLabel('Mức mưa',{exact:true}).fill('6');await capture('wind-rain-sliders');
  await open('Điều kiện bay',false);await open('Điều kiện bay');assert.equal(await wind.inputValue(),'4');
  await button('Đặt lại: không gió, không mưa').click();assert.deepEqual(await page.evaluate(()=>[window.__UAV__.weather.target.wind,window.__UAV__.weather.target.rain]),[0,0]);
  checks.push('Device fault blocks prepare with keyboard recovery; keyboard weather increments/reset change real target and survive disclosure');
  await open('Điều kiện bay',false);const before=await page.locator('.viewport canvas').boundingBox();
  await button('Thu gọn bảng điều khiển').click();await frames();const after=await page.locator('.viewport canvas').boundingBox();
  assert.ok(after.width>before.width+300);assert.ok(await button('Chuẩn bị bài bay').isVisible());await capture('panel-collapsed');await button('Mở bảng điều khiển').click();
  const layout={before,after,normal:await page.locator('.viewport canvas').boundingBox()};
  await button('Chuẩn bị bài bay').click();await capture('preflight-pinned-actions');
  const dock=await page.locator('.flight-dock').boundingBox();assert.ok(dock.y+dock.height<=768);
  await button('Hủy chuẩn bị').click();await button('Thử lại từ H').click();
  checks.push('Sidebar collapses/reopens while action dock stays reachable; laptop canvas/action bounds verified');
  // Preserve eye/model scale while comparing old/new optics at physically reached states.
  await page.evaluate(()=>{const w=window.__UAV__;w.weather.current={...w.weather.target};w.drone.paused=true;window.__newPilot={...w.pilotStation};});
  for(const [label,target] of [['home',null],['takeoff',[-20,5.32,0]],['center',[0,5.32,0]],['far-left',[-17,5.32,-9]],['far-right',[18,5.32,-9]],['high-center',[0,10.32,0]]]){
    if(target) await flyTo(target);
    await page.evaluate(()=>{const w=window.__UAV__;w.pilotStation={...window.__newPilot,verticalFov:70,initialYaw:-Math.PI/2,initialPitch:Math.atan2(.385,17)};w.recenterPilot();});
    await frames();await metric('before-'+label);await capture('pilot-before-'+label);
    await page.evaluate(()=>{const w=window.__UAV__;w.pilotStation={...window.__newPilot};w.recenterPilot();});
    await frames();const m=await metric('after-'+label);await capture('pilot-after-'+label);
    assert.deepEqual(m.eye,[0,1.615,17]);assert.equal(m.zoom,1);assert.deepEqual(m.scale,[1,1,1]);assert.equal(m.fov,55);
    if(label==='home') {assert.ok(Math.abs(m.ndc[0])<.65 && Math.abs(m.ndc[1])<.5);assert.equal(m.guide,false);}
    if(target) {assert.equal(m.guide,true);assert.ok(Math.abs(m.position[0]-m.ground[0])<1e-5&&Math.abs(m.position[2]-m.ground[2])<1e-5);assert.equal(m.ground[1],.025);}
    if(label==='high-center') {await page.locator('.head-more>summary').click();for(let i=0;i<2;i++) await button('Nhìn lên').click();await page.locator('.head-more>summary').click();await capture('pilot-high-center-head-up');const turned=await metric('high-center-turned');assert.ok(Math.abs(turned.ndc[1])<1);}
    if(label==='far-right') {for(let i=0;i<3;i++) await button('Nhìn phải').click();await capture('pilot-far-right-head-turn');const turned=await metric('far-right-turned');assert.ok(Math.abs(turned.ndc[0])<1);}
  }
  const comparison=positions.filter(p=>p.label==='before-center'||p.label==='after-center');assert.ok(comparison[1].pixelHeight>comparison[0].pixelHeight);
  await button('Nhìn trái').click();await capture('pilot-head-left');await button('Nhìn phải').click();await capture('pilot-head-right');await button('Nhìn thẳng').click();await capture('pilot-recentered');
  checks.push('Real force-integrated H/takeoff/center/extremes/two heights before-after optics, fixed eye/unit scale/zoom, explicit far-right head turn and recenter');
  await flyTo([0,5.32,0]);await open('Hỗ trợ luyện tập');await capture('ground-guide-clear-court');
  await page.getByLabel('Hiện vị trí dưới máy bay',{exact:true}).uncheck();await frames();assert.equal(await page.evaluate(()=>window.__UAV__.groundGuide.group.visible),false);
  await page.getByLabel('Hiện vị trí dưới máy bay',{exact:true}).check();
  await page.evaluate(()=>{const w=window.__UAV__;w.setWeatherLevels(0,8);w.weather.current={...w.weather.target};});await capture('ground-guide-rain-court');
  await flyTo([23,5.32,0]);await page.locator('.training-scene-tools .camera-aids>summary').click();await button('Toàn cảnh').click();await page.locator('.training-scene-tools .camera-aids>summary').click();await capture('ground-guide-rain-grass');
  assert.ok(Math.abs((await metric('grass')).ground[1]+.01)<1e-8);
  await page.evaluate(()=>{const w=window.__UAV__;w.setWeatherLevels(0,0);w.weather.current={...w.weather.target};});await capture('ground-guide-clear-grass');
  await flyTo([-20,.32,0]);await frames();assert.equal(await page.evaluate(()=>window.__UAV__.groundGuide.group.visible),false);await page.evaluate(()=>window.__UAV__.drone.disarm());
  checks.push('Training guide follows actual displayed pose vertically on court/grass in clear/rain, toggles off, fades at touchdown and never changes physics');
  await nav('Giảng viên');await frames();assert.equal(await page.evaluate(()=>window.__UAV__.groundGuide.group.visible),false);assert.equal(await page.evaluate(()=>window.__UAV__.setGroundGuide(true)),false);
  await nav('Thi thử');const mock=await page.evaluate(()=>{const w=window.__UAV__;w.groundGuideEnabled=true;return {enable:w.setGroundGuide(true),weather:w.setWeatherLevels(10,10),shown:w.groundGuide.group.visible};});assert.deepEqual(mock,{enable:false,weather:false,shown:false});
  assert.equal(await page.getByLabel('Hiện vị trí dưới máy bay',{exact:true}).count(),0);await button('Chuẩn bị bài bay').click();await frames();
  assert.equal(await page.evaluate(()=>window.__UAV__.groundGuide.group.visible),false);await capture('mock-no-assistance');await button('Hủy chuẩn bị').click();await nav('Luyện tập');await button('Thử lại từ H').click();
  checks.push('Mock before/during attempt rejects weather/guide API, ignores enabled preference and hides aid UI; instructor cannot activate guide');
  // Browser-zoom-equivalent layout: same physical screen, half CSS viewport and DPR2.
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:683,height:384,deviceScaleFactor:2,mobile:false});await frames();await overflow();await capture('zoom-200-equivalent');
  await open('Bài bay');await page.getByLabel('Tên hoặc mã học viên',{exact:true}).focus();await page.keyboard.press('Control+A');await page.keyboard.type('Kiem tra chu lon');assert.equal(await page.getByLabel('Tên hoặc mã học viên',{exact:true}).inputValue(),'Kiem tra chu lon');
  await button('Chuẩn bị bài bay').scrollIntoViewIfNeeded();assert.ok(await button('Chuẩn bị bài bay').isVisible());await cdp.send('Emulation.clearDeviceMetricsOverride');
  await page.setViewportSize({width:1024,height:768});await frames();await capture('training-tablet');await overflow();
  await page.setViewportSize({width:390,height:844});await nav('Cài đặt');await capture('mobile-configuration');await overflow();await nav('Xem lại bài bay');await capture('mobile-review');await overflow();
  checks.push('200% zoom-equivalent CSS viewport/DPR reflow with retained inputs and reachable actions; tablet/mobile configuration/review without horizontal overflow');
  assert.deepEqual(errors,[]);
  await writeFile('docs/task-ux-browser-evidence.json',JSON.stringify({date:new Date().toISOString(),url:base,browser:browser.version(),bundle,checks,screenshots,positions,layout,errors,limits:['Synthetic velocity-command screenshots, no human usability or RC hardware validation','200% zoom-equivalent CDP viewport/DPR emulation; native browser zoom/assistive technology still needs classroom verification','Only Training without replay permits ground assistance; no indicator is recorded']},null,2));
  console.log(JSON.stringify({checks:checks.length,screenshots:screenshots.length,errors}));
}catch(e){await page.screenshot({path:'/tmp/uav-task-ux-failure.png',fullPage:true});console.error(e);process.exitCode=1;}finally{await browser.close();}
