# -*- coding: utf-8 -*-
"""
Exporta el estado del tablero de Plane y del repositorio a `datos_proyecto.py`.

El informe no consulta Plane en vivo a proposito: regenerar el PDF dentro de un
mes tiene que devolver el mismo documento, no el estado del tablero de ese dia.
Asi que el estado se congela aqui, en un modulo de Python que se versiona junto
al informe y que lleva su fecha de corte escrita.

Uso:
    PLANE_API_KEY=plane_api_xxx python docs/exportar_plane.py
    PLANE_API_KEY=... python docs/exportar_plane.py --corte "20 de septiembre de 2026"

Sin `PLANE_API_KEY` no hace nada: el modulo existente se queda como esta.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import urllib.request
from collections import Counter, defaultdict

BASE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(BASE)
SALIDA = os.path.join(BASE, "datos_proyecto.py")

API = "https://plane.brandsofts.com/api/v1"
WS = "ceutec"
PROYECTO = "e899dc5c-31d3-463b-aad2-81a4fe0f141a"

# Nombres de pantalla de Plane -> nombre de persona. El tablero guarda alias
# ("AlejandraFun"), y un informe academico no puede citar alias.
CORTO = {"Roberto Ortega": "R. Ortega", "AlejandraFun": "Y. Funes",
         "Angel Cardona": "A. Cardona", "Carlos Figueroa": "C. Figueroa",
         "Esdras": "E. Clother"}
COMPLETO = {"Roberto Ortega": "Roberto Ortega", "AlejandraFun": "Yina Funes",
            "Angel Cardona": "Ángel Cardona",
            "Carlos Figueroa": "Carlos Figueroa",
            "Esdras": "Esdras Clother"}

ESTADO = {"Done": "Terminado", "In Progress": "En progreso",
          "Backlog": "Pendiente", "Todo": "Pendiente",
          "Cancelled": "Cancelado"}
PRIORIDAD = {"urgent": "Crítica", "high": "Alta", "medium": "Media",
             "low": "Baja", "none": "—"}

# Los nombres de modulo del tablero llevan la palabra "Gestion" tres veces y no
# caben en una columna de tabla. Se acortan aqui, no en el informe.
MODULO_CORTO = {
    "1. Descubrimiento y Definición": "1. Descubrimiento y Definición",
    "2. Gestión de Órdenes de Trabajo": "2. Órdenes de Trabajo",
    "3. Autenticación y Permisos": "3. Autenticación y Permisos",
    "4. Gestión de Clientes y Equipos": "4. Clientes y Equipos",
    "5. Panel de Técnicos": "5. Panel de Técnicos",
    "6. Gestión de Inventario y Repuestos": "6. Inventario y Repuestos",
    "7. Mantenimiento Preventivo / Programado": "7. Mantenimiento Preventivo",
    "8. Notificaciones": "8. Notificaciones",
    "9. Reportes e Historial": "9. Reportes e Historial",
    "10. Implementación, Despliegue y Capacitación":
        "10. Implementación y Despliegue",
}

SPRINTS_META = [
    ("Sprint 1", "6–19 ago 2026", "6 al 19 de agosto de 2026"),
    ("Sprint 2", "20 ago–2 sep 2026", "20 de agosto al 2 de septiembre de 2026"),
    ("Sprint 3", "3–20 sep 2026", "3 al 20 de septiembre de 2026"),
]


# ---------------------------------------------------------------------------
# Plane
# ---------------------------------------------------------------------------
def _pedir(clave, ruta, params=""):
    req = urllib.request.Request(API + ruta + params,
                                 headers={"x-api-key": clave})
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read().decode())


def _todo(clave, ruta):
    """Recorre la paginacion por cursor de Plane hasta agotarla."""
    acumulado, cursor = [], None
    while True:
        params = "?per_page=100" + ("&cursor=%s" % cursor if cursor else "")
        pagina = _pedir(clave, ruta, params)
        if isinstance(pagina, list):
            return pagina
        acumulado += pagina.get("results", [])
        if pagina.get("next_page_results") and pagina.get("next_cursor"):
            cursor = pagina["next_cursor"]
        else:
            return acumulado


def leer_plane(clave):
    raiz = "/workspaces/%s/projects/%s" % (WS, PROYECTO)
    datos = {"states": _todo(clave, raiz + "/states/"),
             "cycles": _todo(clave, raiz + "/cycles/"),
             "modules": _todo(clave, raiz + "/modules/"),
             "members": _todo(clave, raiz + "/members/"),
             "issues": _todo(clave, raiz + "/issues/")}
    datos["cycle_issues"] = {
        c["name"]: [x.get("issue") or x.get("id")
                    for x in _todo(clave, raiz + "/cycles/%s/cycle-issues/" % c["id"])]
        for c in datos["cycles"]}
    datos["module_issues"] = {
        m["name"]: [x.get("issue") or x.get("id")
                    for x in _todo(clave, raiz + "/modules/%s/module-issues/" % m["id"])]
        for m in datos["modules"]}
    return datos


# ---------------------------------------------------------------------------
# Repositorio
# ---------------------------------------------------------------------------
def _git(*args):
    try:
        return subprocess.check_output(["git"] + list(args), cwd=RAIZ,
                                       text=True, encoding="utf-8").strip()
    except Exception:
        return ""


def leer_repositorio():
    esquema = ""
    ruta = os.path.join(RAIZ, "backend", "prisma", "schema.prisma")
    if os.path.exists(ruta):
        esquema = open(ruta, encoding="utf-8").read()

    migraciones = os.path.join(RAIZ, "backend", "prisma", "migrations")
    n_mig = len([d for d in os.listdir(migraciones)
                 if os.path.isdir(os.path.join(migraciones, d))]) \
        if os.path.isdir(migraciones) else 0

    rutas_http = casos_e2e = suites_e2e = casos_unit = 0
    for carpeta, patron in ((os.path.join(RAIZ, "backend", "src"),
                             r"@(?:Get|Post|Patch|Put|Delete)\("),):
        for raiz_dir, _, ficheros in os.walk(carpeta):
            for f in ficheros:
                if f.endswith(".controller.ts"):
                    texto = open(os.path.join(raiz_dir, f), encoding="utf-8").read()
                    rutas_http += len(re.findall(patron, texto))

    caso = re.compile(r"(?m)^\s*(?:it|test)(?:\.each\([^)]*\))?\s*\(")
    pruebas = os.path.join(RAIZ, "backend", "test")
    if os.path.isdir(pruebas):
        for f in sorted(os.listdir(pruebas)):
            if f.endswith(".e2e-spec.ts"):
                suites_e2e += 1
                casos_e2e += len(caso.findall(
                    open(os.path.join(pruebas, f), encoding="utf-8").read()))
    for raiz_dir, _, ficheros in os.walk(os.path.join(RAIZ, "backend", "src")):
        for f in ficheros:
            if f.endswith(".spec.ts"):
                casos_unit += len(caso.findall(
                    open(os.path.join(raiz_dir, f), encoding="utf-8").read()))

    # Commits dentro de la ventana de cada Sprint. Interesa porque el
    # repositorio se inicializo en el Sprint 2 y el dato lo deja a la vista.
    fechas = [l for l in _git("log", "--format=%ad", "--date=short").splitlines() if l]
    ventanas = [("Sprint 1", "2026-08-06", "2026-08-19"),
                ("Sprint 2", "2026-08-20", "2026-09-02"),
                ("Sprint 3", "2026-09-03", "2026-09-20")]
    por_sprint = [(n, sum(1 for f in fechas if desde <= f <= hasta))
                  for n, desde, hasta in ventanas]

    return {
        "commits": int(_git("rev-list", "--count", "HEAD") or 0),
        "commits_por_sprint": por_sprint,
        "primer_commit": _git("log", "--reverse", "--format=%ad", "--date=short").split("\n")[0],
        "ultimo_commit": _git("log", "-1", "--format=%ad", "--date=short"),
        "modelos": len(re.findall(r"(?m)^model ", esquema)),
        "enums": len(re.findall(r"(?m)^enum ", esquema)),
        "migraciones": n_mig,
        "rutas_http": rutas_http,
        "suites_e2e": suites_e2e,
        "casos_e2e": casos_e2e,
        "casos_unitarios": casos_unit,
    }


# ---------------------------------------------------------------------------
# Composicion del modulo
# ---------------------------------------------------------------------------
def _clave_orden(issue, por_id):
    """Ordena por el numero del elemento (2.3), con los hijos tras su padre."""
    propio = issue
    hijo = 0
    if issue.get("parent") and issue["parent"] in por_id:
        propio = por_id[issue["parent"]]
        hijo = 1
    m = re.match(r"^(\d+)\.(\d+)", propio["name"])
    prefijo = (int(m.group(1)), int(m.group(2))) if m else (99, 99)
    return prefijo + (hijo, propio["sequence_id"], issue["sequence_id"])


def componer(datos, repo, corte):
    estados = {s["id"]: s["name"] for s in datos["states"]}
    miembros = {m["id"]: m["first_name"] for m in datos["members"]}
    por_id = {i["id"]: i for i in datos["issues"]}

    def responsable(i):
        nombres = [CORTO.get(miembros.get(a), "") for a in i.get("assignees", [])]
        nombres = [n for n in nombres if n]
        return ", ".join(nombres) if nombres else "—"

    def fila(i):
        return ("TCI-%d" % i["sequence_id"], i["name"], responsable(i),
                PRIORIDAD.get(i.get("priority"), "—"),
                ESTADO.get(estados.get(i["state"]), "?"))

    def ordenar(ids):
        items = [por_id[x] for x in ids if x in por_id]
        return sorted(items, key=lambda i: _clave_orden(i, por_id))

    salida = []
    w = salida.append
    w('# -*- coding: utf-8 -*-')
    w('"""')
    w('Estado del proyecto al corte del informe (%s).' % corte)
    w('')
    w('Generado por `docs/exportar_plane.py` desde el tablero de Plane del')
    w('proyecto y desde el propio repositorio. No se edita a mano: se regenera.')
    w('"""')
    w('')
    w('FECHA_CORTE = %r' % corte)
    w('')

    conteo = Counter(estados.get(i["state"]) for i in datos["issues"])
    w('RESUMEN_PLANE = {')
    w('    "total": %d,' % len(datos["issues"]))
    w('    "hechos": %d,' % conteo.get("Done", 0))
    w('    "curso": %d,' % conteo.get("In Progress", 0))
    w('    "pendientes": %d,' % (conteo.get("Backlog", 0) + conteo.get("Todo", 0)))
    w('}')
    w('')

    orden_mod = sorted(datos["module_issues"],
                       key=lambda m: int(m.split(".")[0]))
    w('# (módulo, terminados, total)')
    w('MODULOS = [')
    for mn in orden_mod:
        items = ordenar(datos["module_issues"][mn])
        hechos = sum(1 for i in items if estados.get(i["state"]) == "Done")
        w('    (%r, %d, %d),' % (MODULO_CORTO.get(mn, mn), hechos, len(items)))
    w(']')
    w('')

    w('# (sprint, periodo abreviado, terminados, en curso, pendientes)')
    w('SPRINTS = [')
    for nombre, corto, _ in SPRINTS_META:
        items = ordenar(datos["cycle_issues"].get(nombre, []))
        c = Counter(estados.get(i["state"]) for i in items)
        w('    (%r, %r, %d, %d, %d),'
          % (nombre, corto, c.get("Done", 0), c.get("In Progress", 0),
             c.get("Backlog", 0) + c.get("Todo", 0)))
    w(']')
    w('')
    w('PERIODOS = {')
    for nombre, _, largo in SPRINTS_META:
        w('    %r: %r,' % (nombre, largo))
    w('}')
    w('')

    w('# Sprint Backlog: (clave, elemento, responsable, prioridad, estado)')
    w('POR_SPRINT = {')
    for nombre, _, _ in SPRINTS_META:
        w('    %r: [' % nombre)
        for i in ordenar(datos["cycle_issues"].get(nombre, [])):
            w('        %r,' % (fila(i),))
        w('    ],')
    w('}')
    w('')

    w('# Product Backlog por módulo: (módulo, [(clave, elemento, resp, prio, estado)])')
    w('BACKLOG = [')
    for mn in orden_mod:
        w('    (%r, [' % MODULO_CORTO.get(mn, mn))
        for i in ordenar(datos["module_issues"][mn]):
            w('        %r,' % (fila(i),))
        w('    ]),')
    w(']')
    w('')

    carga = defaultdict(lambda: [0, 0])
    for i in datos["issues"]:
        for aid in i.get("assignees", []):
            nombre = COMPLETO.get(miembros.get(aid))
            if not nombre:
                continue
            carga[nombre][1] += 1
            if estados.get(i["state"]) == "Done":
                carga[nombre][0] += 1
    w('# (integrante, elementos terminados, elementos asignados)')
    w('CARGA = [')
    for nombre in sorted(carga, key=lambda k: (-carga[k][1], k)):
        w('    (%r, %d, %d),' % (nombre, carga[nombre][0], carga[nombre][1]))
    w(']')
    w('')
    w('SIN_ASIGNAR = %d'
      % sum(1 for i in datos["issues"] if not i.get("assignees")))
    w('')
    w('# Indicadores leídos del repositorio.')
    w('INDICADORES = {')
    for k in sorted(repo):
        w('    %r: %r,' % (k, repo[k]))
    w('}')
    w('')
    return "\n".join(salida)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--corte", default="20 de septiembre de 2026")
    ap.add_argument("--clave", default=os.environ.get("PLANE_API_KEY", ""))
    args = ap.parse_args()

    if not args.clave:
        print("Sin PLANE_API_KEY: no se toca datos_proyecto.py.", file=sys.stderr)
        return 1

    datos = leer_plane(args.clave)
    repo = leer_repositorio()
    open(SALIDA, "w", encoding="utf-8").write(componer(datos, repo, args.corte))
    print("Escrito %s (%d work items, %d commits)."
          % (SALIDA, len(datos["issues"]), repo["commits"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
