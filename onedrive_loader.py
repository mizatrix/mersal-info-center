import pandas as pd
import requests
from io import BytesIO

# 🔗 روابط OneDrive
ONEDRIVE_URL = "https://mersalcharity-my.sharepoint.com/:x:/g/personal/omar_abdallah_mersal-ngo_org1/IQAZAIJBc3rMR4MABivs_NY4AU9ZwCDrPRi6BkAVIcAzCsY?download=1"
SERVICES_URL = "https://mersalcharity-my.sharepoint.com/:x:/g/personal/omar_abdallah_mersal-ngo_org1/IQAJo7kuiuNzTYl7RkX1w_A6Ab45dnNs4ZUiC3o6WHnZD4U?download=1"


# ─────────────────────────────────────────────
# 📥 تحميل Excel
# ─────────────────────────────────────────────
def load_excel(url, sheets, usecols=None):
    try:
        r = requests.get(url, allow_redirects=True)
        file = BytesIO(r.content)

        data = pd.read_excel(
            file,
            sheet_name=sheets,
            engine="openpyxl",
            usecols=usecols
        )

        if isinstance(data, dict):
            df = pd.concat(data.values(), ignore_index=True)
        else:
            df = data

        df.columns = df.columns.astype(str).str.strip()

        return df

    except Exception as e:
        print("❌ Error:", e)
        return pd.DataFrame()


# ─────────────────────────────────────────────
# 🚀 تحميل البيانات الأساسية
# ─────────────────────────────────────────────
def load_data():

    cases_sheets = ["all التكوين", "تكوين كالك القديم"]
    services_sheets = ["2014-2024"]

    # 🟢 الحالات
    cases_cols = [
        "C-Code",
        "P-Code",
        "Name",
        "Age",
        "Year",
        "الجنسية",
        "الرقم القومى",
        "تاريخ الميلاد",
        "رقم كارت المفاوضية للفرد",
        "رقم ملف المفاوضية",
        "كود المفاوضية",
        "موقف اللجوء"
    ]

    # 🟢 الخدمات
    services_cols = [
        "C-Code",
        "P-Code",
        "Name",
        "عدد الخدمات",
        "التكلفة",
        "الملف",
        "الجنسية" ,
        "موقف اللجوء"
    ]

    cases_df = load_excel(ONEDRIVE_URL, cases_sheets, usecols=cases_cols)
    services_df = load_excel(SERVICES_URL, services_sheets, usecols=services_cols)

    # تحسين الأداء
    if not cases_df.empty:
        cases_df["C-Code"] = cases_df["C-Code"].astype(str).str.strip()

    if not services_df.empty:
        services_df["C-Code"] = services_df["C-Code"].astype(str).str.strip()

    return cases_df, services_df