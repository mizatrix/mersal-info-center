from onedrive_loader import load_data
import pandas as pd

class DataBackend:

    def __init__(self):
        print("🚀 تحميل الداتا من OneDrive...")
        self.cases_df, self.services_df = load_data()

    # ─────────────────────────────
    # 🔍 البحث
    # ─────────────────────────────
    def search(self, code="", name="", id_type="", id_value="",
           nationality="", asylum="", year_from="", year_to="", **kwargs):

     df = self.cases_df.copy()

    # 🟢 تنظيف البيانات
     for col in ["C-Code", "Name", "الجنسية", "موقف اللجوء"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    # 🟢 الكود
     if code:
        df = df[df["C-Code"].str.contains(code, case=False, na=False)]

    # 🟢 الاسم
     if name:
        df = df[df["Name"].str.contains(name, case=False, na=False)]

    # 🟢 الرقم
     if id_value and id_type and id_type != "— نوع الرقم —":

        id_map = {
            "الرقم القومي": "الرقم القومى",
            "رقم المفاوضية للفرد": "رقم كارت المفاوضية للفرد",
            "رقم المفاوضية للأسرة": "رقم ملف المفاوضية",
            "رقم كارت المفاوضية": "كود المفاوضية",
        }

        col = id_map.get(id_type)

        if col and col in df.columns:
            df = df[df[col].astype(str).str.contains(id_value, na=False)]

    # 🟢 الجنسية
     if nationality and nationality != "— اختر الجنسية —":
        df = df[df["الجنسية"].str.contains(nationality, na=False)]

    # 🟢 اللجوء
     if asylum and asylum != "— اختر الموقف —":
        df = df[df["موقف اللجوء"].str.contains(asylum, na=False)]

     return df


    # ─────────────────────────────
    # 📊 الكروت
    # ─────────────────────────────
    def calculate_stats(self, code):

        code = str(code).strip()

        # 🟢 الحالات (P-Code فيه -C- فقط)
        cases_df = self.cases_df[
            self.cases_df["C-Code"].astype(str).str.strip() == code
        ]

        cases_count = cases_df[
            cases_df["P-Code"]
            .astype(str)
            .str.contains("-C-", na=False)   # 👈 أهم تعديل
        ].shape[0]

        # 🟢 الخدمات
        services_df = self.services_df[
            self.services_df["C-Code"].astype(str).str.strip() == code
        ]

        # 🟢 عدد الخدمات
        services_count = pd.to_numeric(
            services_df["عدد الخدمات"], errors="coerce"
        ).fillna(0).sum()

        # 🟢 التكلفة
        cost = pd.to_numeric(
            services_df["التكلفة"], errors="coerce"
        ).fillna(0).sum()

        print("DEBUG خدمات:", services_count)
        print("DEBUG تكلفة:", cost)

        return int(cases_count), int(services_count), float(cost)