const oracledb = require('oracledb');
const parse = require('csv-parse');
const fs = require('fs');

const argv = require('minimist')(process.argv.slice(2));
const inputFile = argv.file;

// reference: https://stackoverflow.com/a/10073788
function padLeft(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

function parseCsv() {
  console.log('read file');
  return new Promise((resolve, reject) => {
    let parsedResults = [];
    fs.readFile(inputFile, function (err, contents) {
      if (err) {
        console.error(err);
        reject('Could not read file.');
      }
      parse(contents, { columns: true }, function (err, output) {
        output.forEach(item => {
          let formattedId = padLeft(item.StudentID, 9)
          let studentIdCourseCodeVersion = { studentId: formattedId, courseCode: item.CourseCode, version: item['New Version (COS Version)'] }

          parsedResults.push(studentIdCourseCodeVersion);
        });
        if (parsedResults) {
          resolve(parsedResults);
        }
        else {
          reject('No parsed results.');
        }
      })
    })
  })
}

async function queryPlease() {

  let connection;
  let csvValues = await parseCsv();

  try {
    console.log('open connection');
    connection = await oracledb.getConnection(
      {
        user: process.env.PAMSDEVUSER,
        password: process.env.PAMSDEVPW,
        connectString: process.env.PAMSCONNECTSTRING
      });
      for(let i = 0; i < csvValues.length; i++ ) {
        let selectQuery = `select
                            code,
                            cv.id,
                            c.TITLE,
                            c.VERSION AS COS_version,
                            COURSE_STUDY_ID
                          from
                            wguprograms.COURSE_VERSION cv
                          JOIN
                            wgucos.courses c
                          ON c.id = cv.COURSE_STUDY_ID
                          where
                            code='${csvValues[i].courseCode}' and
                            review_status=5
                            and c.VERSION='${csvValues[i].version}'
                          order by
                            major_version`;

        
      const result = await connection.execute(selectQuery);

      let obj = {}
  
      if (result.rows.length > 0) {
        for (let i = 0; i < result.metaData.length; i++) {
          obj[result.metaData[i].name] = result.rows[0][i];
        }
      } else {
        console.log('No Values for this query ');
      }
      const finalObj = Object.assign(obj, csvValues[i]);
      if(finalObj.COURSE_STUDY_ID && finalObj.TITLE) {
        let insertString = `INSERT INTO wguaap.TBL_COS_VERSION_OVERRIDE (STUDENT_PIDM, STUDENT_LOGIN_NAME, ASSESSMENT_CODE, COURSE_ID, COURSE_TITLE, COURSE_VERSION, CREATION_DATE) VALUES ((SELECT g.gobtpac_pidm FROM GENERAL.gobtpac g JOIN saturn.SPRIDEN s
          ON s.SPRIDEN_PIDM = g.GOBTPAC_PIDM AND s.SPRIDEN_CHANGE_IND IS NULL WHERE SPRIDEN_ID = '${finalObj.studentId}'),(SELECT g.GOBTPAC_EXTERNAL_USER FROM GENERAL.gobtpac g JOIN saturn.SPRIDEN s ON s.SPRIDEN_PIDM = g.GOBTPAC_PIDM AND
          s.SPRIDEN_CHANGE_IND IS NULL WHERE SPRIDEN_ID = '${finalObj.studentId}'), '${finalObj.courseCode}', ${finalObj.COURSE_STUDY_ID}, '${finalObj.TITLE}', 2, systimestamp);`;
        console.log(insertString);
      }      
    }

  } catch (err) {
    console.error(err);
  } finally {
    if (connection) {
      try {
        console.log('close connection')
        await connection.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
}

queryPlease();