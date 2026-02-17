# Documentació de la Implementació de MongoDB

Aquest document descriu de manera estructurada i clara com s'han complert els requisits de persistència de dades mitjançant **MongoDB** en el projecte de gestió de Plans Individualitzats (PI).

---

## 1. Justificació de l'Elecció: MongoDB vs SQL

S'ha optat per **MongoDB** com a sistema de base de dades principal per a la gestió dels expedients PI pels motius següents:

* **Esquema flexible**
  Els documents PI (formats DOCX / ODT) presenten estructures molt variables segons el centre i el cas. MongoDB permet emmagatzemar tota la informació extreta per la IA dins del camp `extractedData` sense haver de definir esquemes rígids ni taules SQL amb un gran nombre de columnes nul·les.

* **Modelatge de dades imbricades**
  La informació educativa és inherentment jeràrquica (Alumne → Motiu → Adaptacions → Detalls). MongoDB permet representar aquesta jerarquia dins d'un únic document, reduint joins i millorant el rendiment en lectures.

* **Escalabilitat i dades no estructurades**
  Els textos lliures (adaptacions, orientacions, diagnòstics) creixen amb el temps i s'adapten millor a un model de documents que no pas a un esquema relacional tradicional.

---

## 2. Estructura de les Col·leccions

### 2.1 Col·lecció `students`

Emmagatzema el perfil principal de l'alumne i tota la informació extreta dels seus Plans Individualitzats.

* **Relació**: 1:N amb la col·lecció `pireviews` (un alumne pot tenir múltiples valoracions).

**Esquema:**

| Camp                                | Tipus         | Descripció                                 |
| ----------------------------------- | ------------- | ------------------------------------------ |
| `_id`                               | String        | RALC de l'alumne (identificador únic)      |
| `name`                              | String        | Nom i cognoms                              |
| `birthDate`                         | String        | Data de naixement en format text           |
| `ownerId`                           | Number        | ID de l'usuari propietari (referència SQL) |
| `centerCode`                        | String        | Codi del centre educatiu                   |
| `authorizedUsers`                   | Array<Number> | Llista d'usuaris amb permisos de lectura   |
| `extractedData`                     | Object        | Contenidor principal de dades extretes     |
| `extractedData.dadesAlumne`         | Object        | Dades demogràfiques                        |
| `extractedData.dadesAlumne.curs`    | String        | Curs acadèmic                              |
| `extractedData.motiu`               | Object        | Motiu del PI                               |
| `extractedData.motiu.diagnostic`    | String        | Text del diagnòstic                        |
| `extractedData.adaptacionsGenerals` | Array<String> | Llista d'adaptacions proposades            |

---

### 2.2 Col·lecció `pireviews`

Conté les valoracions realitzades pels docents sobre l'efectivitat dels Plans Individualitzats.

* **Relació**: N:1 amb `students`, mitjançant el camp `studentRalc`.

**Esquema:**

| Camp                       | Tipus  | Descripció                        |
| -------------------------- | ------ | --------------------------------- |
| `studentRalc`              | String | Referència al `_id` de `students` |
| `authorId`                 | Number | ID de l'usuari docent (SQL)       |
| `authorName`               | String | Nom del docent                    |
| `rating`                   | Number | Valoració global (1–5)            |
| `comment`                  | String | Comentari textual                 |
| `effectiveness`            | Object | Desglossament d'efectivitat       |
| `effectiveness.academic`   | Number | Valoració acadèmica (1–5)         |
| `effectiveness.behavioral` | Number | Valoració conductual (1–5)        |
| `effectiveness.emotional`  | Number | Valoració emocional (1–5)         |

---

### 2.3 Col·lecció `centers`

Serveix com a memòria cau local (bulk import) de centres educatius per facilitar cerques i traspassos d'alumnes.

**Esquema:**

| Camp      | Tipus  | Descripció                     |
| --------- | ------ | ------------------------------ |
| `code`    | String | Codi oficial del centre (únic) |
| `name`    | String | Nom del centre                 |
| `email`   | String | Correu electrònic de contacte  |
| `address` | String | Adreça física                  |

---

## 3. Agregacions amb Pipeline vs Consultes Simples

Per a determinats endpoints estadístics, com ara `/api/stats/effectiveness`, una consulta simple no és suficient.

### Motiu de l'ús d'Aggregation Pipeline

* Cal combinar dades de dues col·leccions (`pireviews` i `students`).
* És necessari filtrar per centre educatiu.
* S'han de calcular mitjanes de camps niuats.
* Es requereix una categorització dinàmica dels diagnòstics.

### Pipeline utilitzat

1. **`$lookup`**: Uneix `pireviews` amb `students` mitjançant el RALC.
2. **`$match`**: Filtra els resultats segons el centre de l'usuari administrador.
3. **`$addFields` + `$filter`**: Aplica el motor de síntesi per categoritzar diagnòstics en temps real.
4. **`$group`**: Agrupa per categoria i calcula mitjanes (`$avg`) de rating i efectivitats.
5. **`$project`**: Dona format al resultat final i normalitza decimals.

---

## 4. Consultes Avançades i Operadors MongoDB

S'ha implementat un cercador avançat que permet filtres complexos sobre els expedients PI, fent ús de diversos operadors de MongoDB:

* **Dot Notation**
  Accés directe a camps niuats com `extractedData.dadesAlumne.curs`.

* **Operadors d'array**
  Ús de `$all` combinat amb expressions regulars per detectar múltiples adaptacions parcials.

* **Operadors lògics**
  Ús de `$and` per combinar criteris de seguretat (propietari o usuari autoritzat) amb filtres de cerca.

* **Regex flexible**
  Permet cerques parcials com "Temps" per trobar coincidències com "Temps extra".

---

Aquesta implementació garanteix flexibilitat, escalabilitat i un accés eficient a dades educatives complexes, adaptant-se a la naturalesa canviant dels Plans Individualitzats.
