# Documentació de la Implementació MongoDB

Aquest document detalla com s'han complert els requisits de la base de dades MongoDB per al projecte de gestió de PIs.

## 1. Justificació: MongoDB vs SQL
S'ha escollit **MongoDB** per a la gestió dels Expedients PI per les següents raons:
- **Esquema Flexible**: Els fitxers PI (DOCX/ODT) tenen estructures variables. MongoDB ens permet guardar tota la informació extreta per la IA (`extractedData`) sense haver de definir una taula SQL amb centenars de columnes nul·les.
- **Dades Imbricades**: La informació educadora és naturalment jeràrquica (Alumne -> Adaptacions -> Detalls). MongoDB permet modelar això en un sol document, millorant el rendiment de lectura.
- **Escalabilitat**: El volum de dades no estructurades (textos d'adaptacions, orientacions) creix millor en una base de dades de documents.

## 2. Estructura de les Col·leccions (Esquema i Relacions)

### Col·lecció: `students` (Dades de l'Alumne)
Emmagatzema el perfil principal de l'alumne i les dades extretes dels PIs.
- **Relacions**: 1:N amb `pireviews` (un alumne té moltes valoracions).
- **Esquema**:
  | Camp | Tipus | Descripció |
  | :--- | :--- | :--- |
  | `_id` | String | RALC (Identificador únic de l'alumne) |
  | `name` | String | Nom i cognoms |
  | `birthDate` | String | Data de naixement (format text) |
  | `ownerId` | Number | ID de l'usuari propietari (SQL Ref) |
  | `centerCode` | String | Codi del centre educatiu |
  | `authorizedUsers` | Array<Number> | Llista d'IDs d'usuaris amb permís de lectura |
  | `extractedData` | Object | **Nivell 1**: Contenidor de dades extretes |
  | `extractedData.dadesAlumne` | Object | **Nivell 2**: Dades demogràfiques |
  | `extractedData.dadesAlumne.curs` | String | **Nivell 3**: Curs acadèmic |
  | `extractedData.motiu` | Object | **Nivell 2**: Motiu del PI |
  | `extractedData.motiu.diagnostic`| String | **Nivell 3**: Text del diagnòstic |
  | `extractedData.adaptacionsGenerals`| Array<String> | **Nivell 2**: Llista de mesures proposades |

### Col·lecció: `pireviews` (Valoracions de l'Equip Docent)
Valoracions fetes pels docents sobre l'efectivitat dels PIs.
- **Relacions**: N:1 amb `students` (via `studentRalc`).
- **Esquema**:
  | Camp | Tipus | Descripció |
  | :--- | :--- | :--- |
  | `studentRalc` | String | Referència a l'`_id` de la col·lecció `students` |
  | `authorId` | Number | ID de l'usuari que fa la valoració (SQL Ref) |
  | `authorName` | String | Nom del docent |
  | `rating` | Number | Valoració global (1-5) |
  | `comment` | String | Text de la valoració |
  | `effectiveness` | Object | **Nivell 1**: Desglossament d'efectivitat |
  | `effectiveness.academic` | Number | **Nivell 2**: Nota acadèmica (1-5) |
  | `effectiveness.behavioral`| Number | **Nivell 2**: Nota conductual (1-5) |
  | `effectiveness.emotional` | Number | **Nivell 2**: Nota emocional (1-5) |

### Col·lecció: `centers` (Gestió de Centres - Bulk)
Caché local dels centres per a cerques i traspassos.
- **Esquema**:
  | Camp | Tipus | Descripció |
  | :--- | :--- | :--- |
  | `code` | String | Codi oficial del centre (Únic) |
  | `name` | String | Nom del centre |
  | `email` | String | Email de contacte |
  | `address` | String | Adreça física |

## 3. Agregacions Pipeline vs Consulta Simple
- **Per què Agregació?**: Per a l'endpoint de `/api/stats/effectiveness`, una consulta simple no seria suficient ja que cal unir dades de dues col·leccions (`pireviews` + `students`), filtrar per centre, i calcular mitjanes aritmètiques de camps niuats en un sol pas.
- **Pipeline utilitzat**:
  1. `$lookup`: Uneix `pireviews` amb `students` per RALC.
  2. `$match`: Filtra els resultats per l'ID de centre de l'usuari administrador.
  3. `$addFields` + `$filter`: Aplica el motor de síntesi per categoritzar diagnòstics "al vol".
  4. `$group`: Agrupa per categoria sintetitzada i calcula `$avg` (mitjana) de rating, acadèmic i conductual.
  5. `$project`: Neteja i dona format final als decimals.

## 4. Consultes Complexes i Operadors
S'ha implementat un cercador avançat ([server.js:L703](file:///c:/Users/HUGO06/Desktop/REPOS%20PERSONALES GITHUB/PROYECTOS/tr2-24-25-front-back-damtr2g6/server/server.js#L703)) que utilitza:
- **Dot Notation**: Per accedir a `extractedData.dadesAlumne.curs`.
- **Operadors d'Array**: `$all` amb Regex per trobar múltiples adaptacions parcials.
- **Operadors Lògics**: `$and` per combinar seguretat (propietari OR autoritzat) amb filtres de cerca.
- **Regex Flexible**: Permet cerques com "Temps" per trobar "Temps extra".
