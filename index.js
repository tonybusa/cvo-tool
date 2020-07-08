// npm install oracledb - only works locally
// https://www.oracle.com/database/technologies/instant-client/macos-intel-x86-downloads.html#ic_osx_inst - need to download 64-bit oracle instant client basic light - directions are at foot of page for installation


const oracledb = require('oracledb');
const parse = require('csv-parse');
const fs = require('fs');

// https://stackoverflow.com/a/10073788
function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}



function parseCsv() {
  console.log('read file');
  let parsedResults = [];
  fs.readFile('./test4.csv', function (err, contents) {
    parse(contents, {
      columns: true
    }, function (err, output) {
      output.forEach(item => {
        let formattedId = pad(item.StudentID, 9)
        let studentIdAndCourseCode = { studentId: formattedId, courseCode: item.CourseCode }
        
        parsedResults.push(studentIdAndCourseCode);
      });
      console.log('parsed results', parsedResults);
      return parsedResults;
    })
  })
}

parseCsv();
// console.log('result', result);



function selectCourseStudyIdAndTitle(code) {
  console.log('open connection');
  oracledb.getConnection(
      {
        user: process.env.PAMSDEVUSER,
        password: process.env.PAMSDEVPW,
        connectString: 'oracle.dev.wgu.edu:1521/lane2.wgu.edu'
      },
      function(err, connection) {
        if (err) { console.log('err', err); return;}
        let selectQuery =  `select
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
                              code='${code}' and
                              review_status=5
                            order by
                              major_version`;

        connection.execute(selectQuery, [], function(err, result) {
          if (err) { console.log('err ', err); return;}
          let obj = {}
          for(let i = 0; i < result.metaData.length; i++) {
            obj[result.metaData[i].name] = result.rows[0][i];            
          }
          console.log('obj ', obj);
          connection.close(function(err) {
            console.log('close connection');
            if (err) {console.log(err);}
          });
        })
      }
  );
}


selectCourseStudyIdAndTitle('C733');


// COURSE_STUDY_ID
// TITLE

// INSERT INTO wguaap.TBL_COS_VERSION_OVERRIDE cvo (STUDENT_PIDM , STUDENT_LOGIN_NAME, ASSESSMENT_CODE, COURSE_ID, COURSE_TITLE, COURSE_VERSION, CREATION_DATE) VALUES ((SELECT g.gobtpac_pidm FROM GENERAL.gobtpac g JOIN saturn.SPRIDEN s
//  ON s.SPRIDEN_PIDM = g.GOBTPAC_PIDM AND s.SPRIDEN_CHANGE_IND IS NULL WHERE SPRIDEN_ID = '000725596'),(SELECT g.GOBTPAC_EXTERNAL_USER FROM GENERAL.gobtpac g JOIN saturn.SPRIDEN s ON s.SPRIDEN_PIDM = g.GOBTPAC_PIDM AND
// s.SPRIDEN_CHANGE_IND IS NULL WHERE SPRIDEN_ID = '000725596'), 'C367', 1327533, 'C367 - Elementary Physical Education and Health Methods', 2, systimestamp);

// `INSERT INTO wguaap.TBL_COS_VERSION_OVERRIDE cvo (STUDENT_PIDM , STUDENT_LOGIN_NAME, ASSESSMENT_CODE, COURSE_ID, COURSE_TITLE, COURSE_VERSION, CREATION_DATE) VALUES ((SELECT g.gobtpac_pidm FROM GENERAL.gobtpac g JOIN saturn.SPRIDEN s
//   ON s.SPRIDEN_PIDM = g.GOBTPAC_PIDM AND s.SPRIDEN_CHANGE_IND IS NULL WHERE SPRIDEN_ID = '000725596'),(SELECT g.GOBTPAC_EXTERNAL_USER FROM GENERAL.gobtpac g JOIN saturn.SPRIDEN s ON s.SPRIDEN_PIDM = g.GOBTPAC_PIDM AND
//   s.SPRIDEN_CHANGE_IND IS NULL WHERE SPRIDEN_ID = '000725596'), 'C367', 1327533, 'C367 - Elementary Physical Education and Health Methods', 2, systimestamp);`