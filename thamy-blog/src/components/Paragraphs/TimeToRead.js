import * as React from 'react'
import SubTitle from './SubTitle'


const TimeToRead = ({children}) => {
    return (
        <SubTitle>
            { `${children} min read` }
        </SubTitle>
    )
}


export default TimeToRead;
