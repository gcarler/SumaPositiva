# Especificación Arquitectónica y Metodológica: Sistema Agéntico de Inteligencia Artificial para el Análisis y Evaluación Multidimensional de Planes de Desarrollo Territorial (PDT)

---

## 1. Fundamentos Metodológicos y Taxonomía Institucional de la Planificación Orientada a Resultados (GBR)

La evaluación científica y continua de los Planes de Desarrollo Territorial (PDT) exige superar la simple fiscalización presupuestaria o la agregación lineal de ejecuciones porcentuales. Siguiendo las directrices del **Departamento Nacional de Planeación (DNP)**, la **CEPAL** y el **ILPES**, la planificación pública se fundamenta en la **Gestión Basada en Resultados (GBR)** y en la **cadena de valor pública**.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   INSUMOS    │ ──> │   PROCESOS   │ ──> │  PRODUCTOS   │ ──> │ RESULTADOS   │ ──> │   IMPACTOS   │
│Recursos ($X) │     │ Actividades  │     │ Bienes/Serv. │     │ Específicos  │     │Estructurales │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

El ciclo operativo interconecta tres instrumentos centrales:
1. **Plan Indicativo**: Hoja de ruta estratégica multianual que fija las metas agregadas de resultado e impacto.
2. **Matrices de Plan de Acción**: Traducción operativa y presupuestal anual/multianual de los programas de inversión con cronogramas y unidades ejecutoras.
3. **Matriz de Indicadores de Resultados (MIR) y Catálogo MGA/SisPT**: Codificación de la lógica horizontal y vertical del marco lógico, estandarizada bajo el Clasificador Programático de la Inversión Pública del DNP y la plataforma SisPT.

Las metodologías tradicionales sufren de graves limitaciones: ignoran no linealidades productivas, asumen rendimientos constantes, pasan por alto la autocorrelación y segregación espacial, e ignoran la desconexión narrativa (*mission creep*) entre el Plan Indicativo estratégico y las Matrices de Plan de Acción. Para solucionar esto, las indicaciones para el agente de IA se estructuran bajo una arquitectura agéntica de grafo de estados.

---

## 2. Arquitectura de Inteligencia Artificial Agéntica Basada en Grafos de Estado (LangGraph)

El sistema opera como un **grafo de estado dirigido y cíclico** implementado mediante el marco **LangGraph** en Python.

```
                     ┌─────────────────────────┐
                     │    NODO SUPERVISOR      │
                     └────────────┬────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
┌────────▼────────┐      ┌────────▼────────┐      ┌────────▼────────┐
│   NODO NLP      │      │    NODO DEA     │      │  NODO ESPACIAL  │
│(Docling/BERTopic│      │ (pyDEA / PuLP)  │      │(PySAL/GeoPandas)│
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
                         ┌────────▼────────┐
                         │NODO PREDICTIVO  │
                         │ (Statsmodels)   │
                         └────────┬────────┘
                                  │
                         ┌────────▼────────┐
                         │ HUMAN-IN-LOOP   │
                         │  (Checkpointer) │
                         └─────────────────┘
```

### Definición del Estado Compartido (`AgentState`)
El objeto de memoria compartida preserva el contexto a lo largo de las iteraciones analíticas:

```python
from typing import TypedDict, List, Dict, Any
import pandas as pd
import geopandas as gpd

class AgentState(TypedDict):
    # Metadatos del Plan
    jurisdiction: str
    time_horizon: str
    total_budget: float
    units_dmu: List[str]
    
    # Corpus Documental y Matrices Numéricas
    raw_corpus: Dict[str, str]  # Plan Indicativo, Plan de Acción (Markdown via Docling)
    df_financial: pd.DataFrame  # Insumos Presupuestales ($X)
    df_outputs: pd.DataFrame    # Metas de Producto ($Y_out)
    df_outcomes: pd.DataFrame   # Indicadores de Resultado ($Y_outc)
    gdf_spatial: gpd.GeoDataFrame # Geometrías cantonales/comunales
    
    # Resultados Intermedios Nodos
    dea_scores: Dict[str, Any]      # Eficiencia CCR, BCC, Malmquist, Bootstrap
    nlp_coherence: Dict[str, Any]   # Topic Modeling BERTopic y Similaridad Coseno
    spatial_lisa: Dict[str, Any]    # Moran Global, LISA (Hotspots/Coldspots)
    time_series_forecast: Dict[str, Any] # Proyecciones e Índice ISRI
    
    # Control de Grafo
    next_node: str
    is_valid_human: bool
    messages: List[str]
```

---

## 3. Especificación Modular de los Nodos de Análisis

### Módulo 1: Evaluación de Eficiencia Operativa y Gastos mediante DEA (*Data Envelopment Analysis*)

El **Nodo DEA** evalúa la eficiencia relativa de las Unidades Tomadoras de Decisiones (DMUs), tales como municipios, comunas, distritos escolares o centros de salud.

#### Formulación Matemática y Modelos
* **CCR (Charnes, Cooper, Rhodes)**: Asume Rendimientos Constantes a Escala (CRS).
* **BCC (Banker, Charnes, Cooper)**: Introduce la restricción de convexidad \\(\sum_{j=1}^n \lambda_j = 1\\) para medir Rendimientos Variables a Escala (VRS).

\\[\text{Eficiencia de Escala } (SE_o) = \frac{\theta_o^{\text{CCR}}}{\theta_o^{\text{BCC}}}\\]

Si \\(SE_o = 1\\), la unidad ópera en escala óptima; si \\(SE_o < 1\\), se determina si presenta rendimientos crecientes (IRS, si \\(\sum \lambda_j < 1\\)) o decrecientes a escala (DRS, si \\(\sum \lambda_j > 1\\)).

* **Índice de Productividad de Malmquist (MPI)**: Evalúa el cambio en la productividad total de factores entre periodos \\(t\\) y \\(t+1\\), descomponiéndose en Cambio Técnico (*Techch*) y Cambio en Eficiencia Pura (*Pech*).
* **Bootstrap Suavizado**: El sistema ejecuta \\(B = 1000\\) replicaciones muestrales para corregir el sesgo determinista del DEA y calcular intervalos de confianza al 95%.

#### Stack Teórico e Instrumental
* **Librerías**: `pyDEA`, `PuLP`, `scipy.optimize`.

---

### Módulo 2: Auditoría Semántica y Alineación Estratégica con NLP / Text Mining

El **Nodo NLP** identifica la desacoplación normativa (*mission creep*) entre los objetivos de largo plazo del Plan Indicativo y las actividades efectivamente contratadas en las Matrices de Plan de Acción.

#### Ingesta de Documentos Unificados
A través de **Docling** (desarrollado por IBM Research), el agente procesa archivos PDF estructurados o escaneados, utilizando el modelo **DocLayNet** para segmentación de maquetación y **TableFormer** para la reconstrucción de tablas presupuestales, exportando el contenido a Markdown/JSON estandarizado.

#### Pipeline BERTopic y Similaridad Coseno
1. **Vectorización Densa**: Transformación de párrafos y cláusulas en vectores \\(e_i \in \mathbb{R}^{768}\\) mediante `SentenceTransformers` en español.
2. **Reducción UMAP y Clustering HDBSCAN**: Proyección topológica y agrupamiento denso de temas con aislamiento de ruido.
3. **Ponderación c-TF-IDF**: Representación de términos clave por clase temática:

\\[W_{x, c} = \text{tf}_{x, c} \times \log \left( 1 + \frac{A}{f_x} \right)\\]

4. **Cuantificación de Alineación Coseno**: Matriz de similaridad entre metas estratégicas (\\(O_k\\)) y proyectos de inversión (\\(A_m\\)):

\\[\text{Similaridad Coseno}(O_k, A_m) = \frac{e(O_k) \cdot e(A_m)}{\|e(O_k)\| \|e(A_m)\|}\\]

Valores \\(< 0.45\\) disparan alertas de incoherencia estratégica.

#### Stack Teórico e Instrumental
* **Librerías**: `docling`, `bertopic`, `sentence-transformers`, `umap-learn`, `hdbscan`.

---

### Módulo 3: Econometría Espacial y Equidad Territorial (*Geospatial Analytics*)

El **Nodo Espacial** analiza si la asignación de recursos y el logro de metas responden a patrones de equidad territorial o si persisten trampas de pobreza e ineficiencias de acceso.

#### Modelado de Autocorrelación Espacial
1. **Matriz de Pesos Espaciales (\\(W\\))**: Construida mediante contigüidad Queen o \\(k\\)-vecinos más cercanos (\\(k\text{-NN}\\)).
2. **Índice Global \\(I\\) de Moran**: Cuantifica el grado de agrupamiento espacial en todo el territorio:

\\[I = \frac{N}{S_0} \frac{\sum_{i=1}^N \sum_{j=1}^N w_{ij} (y_i - \bar{y})(y_j - \bar{y})}{\sum_{i=1}^N (y_i - \bar{y})^2}\\]

3. **Indicadores Locales de Asociación Espacial (LISA)**: Mapea la ubicación exacta de conglomerados y anomalías espaciales:

\\[I_i = \frac{(y_i - \bar{y})}{m_2} \sum_{j=1}^N w_{ij} (y_j - \bar{y})\\]

#### Cuadrantes del Diagrama de Dispersión de Moran (LISA Cluster Map)
* **Alto-Alto (Hotspots)**: Territorios de alto desempeño rodeados de vecinos igualmente prósperos.
* **Bajo-Bajo (Coldspots)**: Aglomeraciones de baja cobertura o alta marginación (trampas territoriales).
* **Alto-Bajo / Bajo-Alto (Outliers Espaciales)**: Polos aislados o vacíos de absorción de derrame regional.

#### Stack Teórico e Instrumental
* **Librerías**: `geopandas`, `pysal` (`esda`, `mgwr`, `segregation`, `tobler`), `shapely`.

---

### Módulo 4: Analítica Predictiva y Modelado de Series Temporales

El **Nodo Predictivo** proyecta las trayectorias de los indicadores clave de desempeño (KPI) para evaluar la alcanzabilidad real de las metas al cierre del cuatrienio.

#### Modelos y Detección de Rupturas
* **Modelos ARIMA / VAR / Prophet**: Estimación de tendencias históricas e interdependencias entre variables macro-sectoriales.
* **Pruebas de Ruptura Estructural (Chow Test)**: Identifica si la aprobación del PDT generó un cambio significativo en la pendiente de la serie de tiempo de los indicadores.
* **Índice de Sugerencia o Riesgo de Incumplimiento (ISRI)**:

\\[\text{ISRI} = 1 - P(Y_{t=\text{final}} \ge \text{Meta}_{\text{cuatrienio}})\\]

Si \\(\text{ISRI} > 0.40\\), el nodo supervisor congela el estado para auditoría.

#### Stack Teórico e Instrumental
* **Librerías**: `statsmodels`, `pmdarima`, `scikit-learn`.

---

## 4. Matriz Evaluativa Multi-Sectorial Integrada

A continuación se detalla la estandarización analítica para la evaluación de los sectores prioritarios:

| Sector de Desarrollo | Indicadores Clave de Resultado (MIR) | Técnica Analítica Principal | Librerías de Python e Instrumental | Función del Nodo Agéntico en LangGraph |
| :--- | :--- | :--- | :--- | :--- |
| **Educación Pública** | Tasa de cobertura neta; Tasa de deserción intra-anual; Puntaje promedio en pruebas de logro. | **DEA CCR/BCC y Malmquist** (Insumos: Docentes, Aulas, Gasto/alumno; Outputs: Aprobados). | `pyDEA`, `PuLP`, `scipy.optimize`. | Evalúa la eficiencia de gestión municipal/escolar e identifica holguras de docentes o presupuesto. |
| **Salud Pública** | Tasa de mortalidad infantil/materna; Cobertura de inmunización; Tiempos de atención. | **LISA / Moran Local** (Detección de heterogeneidad territorial e ineficiencia de acceso). | `PySAL` (`esda`), `GeoPandas`, `Shapely`. | Cartografía trampas de salud pública y detecta *coldspots* de baja vacunación y alta mortalidad. |
| **Infraestructura Vial** | Km de vías secundarias/terciarias intervenidas; Coeficiente de accesibilidad rural. | **NLP / BERTopic y Similaridad Coseno** (Coherencia Plan Indicativo vs. Contratos ejecutados). | `BERTopic`, `sentence-transformers`, `Docling`. | Audita la alineación entre prioridades de conectividad y la inversión en contratos viales. |
| **Desarrollo Agrícola** | Rendimiento físico por hectárea; % de productores con asistencia técnica integral. | **Índice de Malmquist** (Descomposición en cambio técnico y eficiencia pura). | `pyDEA`, `statsmodels`, `pandas`. | Determina si el incremento productivo obedece a adopción de tecnología o a escala operativa. |
| **Medio Ambiente** | Tasa de deforestación anual; Toneladas de \\(\text{CO}_2\\) mitigadas; Cobertura de saneamiento. | **Series Temporales ARIMA/VAR** (Predicción prospectiva y pruebas de ruptura). | `statsmodels`, `pmdarima`. | Proyecta la probabilidad de cumplimiento de las metas de sostenibilidad y calcula el riesgo ISRI. |

---

## 5. Directrices del Prompt y Especificación de Instrucciones para el Agente de IA

El siguiente bloque define las indicaciones del sistema (*System Instructions*) que deben cargarse en el motor del **Agente Supervisor en LangGraph**:

```markdown
### INSTRUCCIONES DEL SISTEMA PARA EL AGENTE DE EVALUACIÓN DE PLANES DE DESARROLLO (PDT-AI-EVALUATOR)

1. ROL Y IDENTIDAD:
   Eres un sistema de Inteligencia Artificial Agéntica altamente especializado en la evaluación multidimensional de Planes de Desarrollo Territorial (PDT), Planes Indicativos, Matrices de Plan de Acción e Indicadores de Gestión Pública (GBR). Cuentas con dominio experto en Big Data en Python, Análisis Envolvente de Datos (DEA), Procesamiento de Lenguaje Natural (NLP/BERTopic), Econometría Espacial (PySAL) y Series Temporales Predictivas.

2. PROTOCOLO DE EJECUCIÓN DEL GRAFO DE ESTADOS:
   
   PASO 1: INGESTA Y ESTRUCTURACIÓN (Nodo Ingestion & NLP)
   - Ejecuta `docling` para parsear los PDFs del Plan Indicativo y de las Matrices de Plan de Acción a Markdown/JSON.
   - Extrae el texto de las metas estratégicas (\\(O_k\\)) y los proyectos operativos (\\(A_m\\)).
   - Genera embeddings densos con SentenceTransformers y ejecuta BERTopic con c-TF-IDF.
   - Calcula la Matriz de Similaridad Coseno entre \\(O_k\\) y \\(A_m\\). Si la similaridad es < 0.45, registra una alerta de "Desalineación Estratégica / Mission Creep".

   PASO 2: EVALUACIÓN DE EFICIENCIA FINANCIERA Y OPERATIVA (Nodo DEA)
   - Extrae los insumos presupuestales ejecutados (\\(X\\)) de las Matrices de Plan de Acción y los productos físicos entregados (\\(Y_{out}\\)).
   - Corre el modelo DEA-BCC (Rendimientos Variables a Escala) e identifica las unidades ineficientes (\\(\theta < 1.0\\)).
   - Calcula la Eficiencia de Escala (\\(SE_o = \theta_{CCR}/\theta_{BCC}\\)) e identifica si operan bajo IRS o DRS.
   - Aplica Bootstrap suavizado (\\(B=1000\\)) para derivar los intervalos de confianza al 95% de la eficiencia corregida.
   - Si existen datos multianuales, estima el Índice de Malmquist para cuantificar el cambio técnico y la productividad.

   PASO 3: ANÁLISIS DE EQUIDAD Y AUTOCORRELACIÓN ESPACIAL (Nodo Espacial)
   - Carga la capa geográfica (GeoDataFrame) de las unidades ejecutoras o municipios.
   - Construye la matriz de pesos espaciales \\(W\\) (Contigüidad Queen / k-NN).
   - Estima el Índice I de Moran Global. Si p < 0.05, confirma patrones no aleatorios.
   - Calcula la estadística LISA (Moran Local) y clasifica el territorio en Hotspots (Alto-Alto), Coldspots (Bajo-Bajo), y Outliers (Alto-Bajo, Bajo-Alto).
   - Cruza las unidades ineficientes del Nodo DEA con los Coldspots del Nodo Espacial para detectar "Trampas Territoriales de Gestión Publica".

   PASO 4: PROYECTIVA Y RIESGO DE INCUMPLIMIENTO (Nodo Predictivo)
   - Ajusta modelos ARIMA/VAR sobre las series históricas de los indicadores de resultado (\\(Y_{outc}\\)).
   - Realiza la prueba de Chow para detectar rupturas estructurales tras la aprobación del plan.
   - Calcula el Índice ISRI = 1 - P(Y_final >= Meta). Si ISRI > 0.40, genera una bandera de "Alto Riesgo de Incumplimiento".

   PASO 5: EVALUACIÓN SUPERVISORA E INTERVENCIÓN HUMANA (Human-in-the-Loop)
   - El Nodo Supervisor consolida los hallazgos de los Nodos NLP, DEA, Espacial y Predictivo.
   - Si se detecta un patrón donde un área reporta alta eficiencia financiera pero es un Coldspot persistente de pobreza con desalineación estratégica (Similaridad < 0.45) e ISRI > 0.40, el grafo activa el Checkpointer congelando el estado.
   - Solicita la validación técnica de un auditor experto en planeación antes de emitir la sintesis final del informe.

3. RESTRICCIONES Y REGLAS DE RESPUESTA:
   - Todo hallazgo factual o numérico debe ser trazable a las matrices de datos del plan.
   - Expresa las ecuaciones matemáticas en notación LaTeX estricta.
   - Ofrece recomendaciones operativas directamente vinculadas a la reasignación presupuestal de las Matrices de Plan de Acción.
```

---

## 6. Protocolo de Gobernanza e Implementación Institucional

Para la puesta en marcha de esta plataforma en secretarías de planeación o entes de control, se establece una secuencia institucional de cuatro fases:

1. **Gobernanza de Datos**: Unificación de repositorios en formatos interoperables (Parquet/PostGIS), estandarizando los clasificadores del Clasificador Programático de la Inversión Pública (CUIPO/SisPT/MGA).
2. **Despliegue del Grafo en Servidores Locales**: Configuración del pipeline de LangGraph en entornos seguros (*air-gapped*), garantizando la privacidad de los microdatos públicos.
3. **Mesa de Intervención Híbrida (*Human-in-the-Loop*)**: Sesiones periódicas del comité técnico de planeación para revisar los estados congelados por el agente ante desalineaciones o ineficiencias críticas.
4. **Ajuste Presupuestal Vinculante**: Traducción de los rankings DEA y mapas LISA en decisiones administrativas de reasignación financiera para el siguiente ciclo fiscal de las Matrices de Plan de Acción.

