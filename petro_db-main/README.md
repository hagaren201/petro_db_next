# Chemical Downstream Visualization Tool

A Streamlit-based interactive tool to visualize petrochemical value chains and downstream routes based on feedstock.

This project focuses on mapping relationships between base chemicals, intermediates, monomers, and polymers, along with optional licensor and supplier information.

---

## 🚀 Features

- Multi-root value chain visualization  
  - C1(Methanol) / C2(Ethylene) / C3(Propylene) / C4(1-Butene, Isobutylene, Butadiene) / Aromatics(Benzene, Toluene, Xylene)
- Lane-based downstream mapping (depth-controlled)
- Interactive filtering:
  - Licensor-based route filtering
  - Supplier-based material filtering
- Highlight / Hide modes for better analysis
- Hover tooltips with:
  - Licensor information
  - Supplier list and capacity
- Support for custom database via Excel upload

---

## 🗂 Project Structure
├── db.py # Streamlit app  
├── db.xlsx # Default database  
├── requirements.txt # Dependencies  
└── README.md  

---

## 📊 Data Structure (Excel)

The application expects the following sheets:

### Required
- `material_master`
- `route_master`
- `route_input_link`
- `route_output_link`

### Optional
- `licensor_master`
- `route_licensor_link`
- `supplier_master`
- `material_supplier_link`

---

## ▶️ Run Locally

```bash
pip install -r requirements.txt
streamlit run db.py
