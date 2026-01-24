# Documentació de la Implementació MongoDB

Aquest document detalla com s'han complert els requisits de la base de dades MongoDB per al projecte de gestió de PIs.

## 1. Justificació: MongoDB vs SQL
S'ha escollit **MongoDB** per a la gestió dels Expedients PI per les següents raons:
- **Esquema Flexible**: Els fitxers PI (DOCX/ODT) tenen estructures variables. MongoDB ens permet guardar tota la informació extreta per la IA (`extractedData`) sense haver de definir una taula SQL amb centenars de columnes nul·les.
- **Dades Imbricades**: La informació educadora és naturalment jeràrquica (Alumne -> Adaptacions -> Detalls). MongoDB permet modelar això en un sol document, millorant el rendiment de lectura.
- **Escalabilitat**: El volum de dades no estructurades (textos d'adaptacions, orientacions) creix millor en una base de dades de documents.

## 2. Estructura de les Col·leccions

### Col·lecció: `students`
Emmagatzema el perfil principal de l'alumne i les dades extretes dels PIs.
- **Camps**: `_id` (RALC), `name`, `birthDate`, `ownerId`, `centerCode`, `authorizedUsers` (Array).
- **Imbricació (3+ nivells)**:
  - `extractedData` (Objecte)
    - `dadesAlumne` (Objecte) -> `nomCognoms`, `curs`, etc.
    - `motiu` (Objecte) -> `diagnostic`.
    - `adaptacionsGenerals` (Array de strings).

### Col·lecció: `pireviews`
Valoracions fetes pels docents sobre l'efectivitat dels PIs.
- **Camps**: `studentRalc` (Ref), `authorId`, `rating`, `comment`.
- **Objecte Imbricat**: `effectiveness` (`academic`, `behavioral`, `emotional`).

### Col·lecció: `jobs`
Gestió de les tasques en segon pla de l'extractor.
- **Camps**: `userId`, `status`, `fileName`, `result` (Objecte flexible).

## 3. Agregacions Pipeline vs Consulta Simple
- **Per què Agregació?**: Per a l'endpoint de `/api/stats/effectiveness`, una consulta simple no seria suficient ja que cal unir dades de dues col·leccions (`pireviews` + `students`), filtrar per centre, i calcular mitjanes aritmètiques de camps niuats en un sol pas.
- **Pipeline utilitzat**:
  1. `$match`: Filtra per centre (Seguretat).
  2. `$lookup`: Uneix amb la col·lecció d'alumnes.
  3. `$unwind`: Aplana els resultats de la unió.
  4. `$group`: Calcula mitjanes (`$avg`) per cada tipus de diagnòstic.
  5. `$sort` i `$project`: Dona format final a la resposta.

## 4. Consultes Complexes i Operadors
S'ha implementat un cercador avançat que utilitza:
- **Dot Notation**: `extractedData.motiu.diagnostic`.
- **Operadors d'Array**: `$in` i `$all` per buscar entre les adaptacions.
- **Operadors Lògics**: `$and`, `$or` i `$regex` per a cerques textuals parcials.
