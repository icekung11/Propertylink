# แนวทางร่วมพัฒนา PropertyLink

อ่าน [README.md](README.md) เพื่อติดตั้ง และ [PROJECT_STATUS.md](PROJECT_STATUS.md) เพื่อดูงานที่เสร็จและงานที่ยังค้าง โดยเฉพาะภาษา/Settings ซึ่งยังอยู่ระหว่างพัฒนา

## เริ่มงาน

```bash
git switch main
git pull --ff-only
git switch -c feature/your-task
```

แยก branch ตามงาน เช่น `fix/settings-language` หรือ `feature/seller-editor` แล้วเปิด Pull Request กลับเข้า `main` อธิบายสิ่งที่แก้และผลตรวจที่รันจริง

## ก่อนส่ง Pull Request

```bash
npm run typecheck
npm run lint
npm run build
```

หากแก้ API หรือ workflow ให้รันชุดทดสอบที่เกี่ยวข้องเพิ่มเติม ใช้ฐานข้อมูลทดสอบส่วนตัว ห้ามชี้ชุดทดสอบที่สร้าง role/ฐานข้อมูล/fixture ไปยัง production

## ฐานข้อมูลและข้อมูลส่วนตัว

- แต่ละคนใช้ `.env` และฐานข้อมูลของตนเอง ห้าม commit secret, connection string จริง, database dump ที่มีข้อมูลผู้ใช้ หรือไฟล์อัปโหลดจริง
- เพิ่ม migration ใหม่ใน `prisma/migrations` หากเปลี่ยนโครงสร้างฐานข้อมูล ห้ามแก้ migration ที่ใช้ร่วมกันไปแล้ว
- ห้ามรัน `prisma/migration-archive` ซ้ำทับฐานปัจจุบัน และอย่า reset ฐานข้อมูลของเพื่อน
- รักษา unique index `uq_user_single_role` แม้ Prisma relation ฝั่ง `User.userRoles` ยังเป็น list
- การเปลี่ยนสิทธิ์ Admin ปัจจุบันมีผลระดับ role กับ Admin ทุกบัญชี

## ภาษาและ Settings

- ใช้ `usePreferences().translateText` สำหรับข้อความ UI และ `useFormatters()` สำหรับราคา/วันที่
- ไม่แปลชื่อผู้ใช้ ชื่อ/รายละเอียดประกาศ หรือข้อความที่ผู้ใช้พิมพ์
- ค่า enum, role, status, URL และ payload ของ API ต้องคงค่าเดิม
- อย่าเปลี่ยนข้อความแปลด้วยการแก้ DOM โดยตรง
- ทดสอบทั้ง EN/TH การรีเฟรช และการเปลี่ยนบัญชีก่อนอ้างว่าส่วน Settings เสร็จสมบูรณ์
