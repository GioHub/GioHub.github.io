import streamlit as st
from openai import OpenAI
import os

# Inicializa cliente con API Key
api_key = os.environ.get("OPENAI_API_KEY") or st.text_input("🔑 Ingresa tu API Key de OpenAI", type="password")
client = OpenAI(api_key=api_key) if api_key else None

st.title("🧠 Generación Automática de Minutas (Flujo 2.2)")
st.markdown("""
Esta herramienta genera **minutas de reunión** y **tablas de acciones** a partir de transcripciones.
Puedes elegir entre:
- 🗂️ Subir archivos `.txt`
- 📝 Pegar el texto directamente
""")

# Selector de modo de entrada
modo = st.radio("Selecciona el modo de entrada:", ["🗂️ Subir archivos", "📝 Pegar texto manualmente"])

# --- Entrada de datos según modo seleccionado ---
transc1, transc2 = "", ""

if modo == "🗂️ Subir archivos":
    file1 = st.file_uploader("Transcripción 1 (base técnica)", type=["txt"])
    file2 = st.file_uploader("Transcripción 2 (opcional, apoyo o nombres)", type=["txt"])

    if file1:
        transc1 = file1.read().decode("utf-8")
    if file2:
        transc2 = file2.read().decode("utf-8")

else:  # modo manual
    transc1 = st.text_area("Transcripción 1 (base técnica)", height=200)
    transc2 = st.text_area("Transcripción 2 (opcional, apoyo o nombres)", height=200)

# --- Botón principal ---
if st.button("🚀 Generar Minuta y Acciones"):
    if not api_key:
        st.error("Por favor, ingresa tu API Key de OpenAI antes de continuar.")
    elif not transc1.strip() and not transc2.strip():
        st.warning("Debes proporcionar al menos una transcripción.")
    else:
        with st.spinner("Procesando... por favor espera unos segundos."):

            # Paso 1: Limpieza / Fusión
            if transc1 and not transc2:
                fused_text = transc1
            elif transc2 and not transc1:
                fused_text = transc2
            else:
                fusion_prompt = f"""
Recibirás dos transcripciones de la misma reunión.
Tu tarea es fusionarlas en una sola, siguiendo estas reglas:
- Usa la **Transcripción A** como base técnica.
- Usa la **Transcripción B** solo para confirmar quién habla, corregir frases y complementar información.
- No repitas contenido.
- Corrige errores de transcripción y elimina ruido (muletillas, repeticiones).
- Mantén un tono claro y profesional.

Transcripción A:
{transc1}

Transcripción B:
{transc2}
"""
                fusion_response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": fusion_prompt}],
                    temperature=0.2
                )
                fused_text = fusion_response.choices[0].message.content

            # Paso 2: Generar minuta
            minuta_prompt = f"""
A partir de la siguiente transcripción limpia, genera una **minuta de reunión de proyecto** con formato estructurado que incluya:

- **Objetivo general**
- **Temas tratados**
- **Decisiones clave**
- **Acciones acordadas**
- **Responsables**
- **Riesgos o bloqueos**
- **Próximos pasos**

Transcripción:
{fused_text}
"""
            minuta_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": minuta_prompt}],
                temperature=0.2
            )
            minuta = minuta_response.choices[0].message.content

            # Paso 3: Extraer acciones
            acciones_prompt = f"""
Extrae todas las **acciones acordadas** de la siguiente minuta. 
Preséntalas en formato tabular Markdown con tres columnas:

| Acción | Responsable | Fecha compromiso |

Si no se menciona una fecha, deja el campo vacío.

Minuta:
{minuta}
"""
            acciones_response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": acciones_prompt}],
                temperature=0.2
            )
            acciones = acciones_response.choices[0].message.content

            # Mostrar resultados
            st.success("✅ Minuta generada correctamente")

            st.subheader("📄 Minuta")
            st.text_area("Minuta generada", value=minuta, height=300)

            st.subheader("✅ Tabla de Acciones")
            st.text_area("Acciones", value=acciones, height=200)

            # Botones de descarga
            st.download_button(
                label="💾 Descargar Minuta",
                data=minuta,
                file_name="minuta_generada.txt",
                mime="text/plain"
            )
            st.download_button(
                label="💾 Descargar Acciones",
                data=acciones,
                file_name="acciones.txt",
                mime="text/plain"
            )
