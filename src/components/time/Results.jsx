import React, { useState, useEffect } from "react";
import moment from "moment";
import Row from "./Row";
import CodeGroup from './Timestamp';

const Results = props => {

  const [timestamp, setTimestamp] = useState("");

  useEffect( () => {
    setTimestamp(Date.parse(props.dateTime)/1000);
  }, [props.dateTime])

  return (
    <>
      <Row>
        <label>Unix timestamp</label>
        <CodeGroup label="Long Time" value={moment(props.dateTime).unix()} />
      </Row>
      <Row>
        <label>Timestamp</label>
        <CodeGroup label="Relative Time" value={moment(props.dateTime).toDate().getTime()} />
      </Row>

    </>
  );
}

export default Results;