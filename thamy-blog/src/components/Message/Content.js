import * as React from 'react';
import styled from "styled-components";

const Content = styled.div`
    display: block;
    max-height: 0;
    padding: 0 .9rem;
    background-color: ${(props) => props.theme.colors.terceary };
    opacity: 0;
    visibility: hidden;
    transition: all 300ms ease 0s;
    &.--error {
        flex: 0 0 100%;
        order: 5;
    }
    &.--visible {
        max-height: 100%;
        padding: 1rem .9rem;
        opacity: 1;
        visibility: visible;
    }
`

const Message = (props) => {
    const msgVisible = props.msgText && "--visible"

    return (
        <Content {...props} className={`${props.className} ${msgVisible}`}>
            {props.msgText}
        </Content>
    )
}

export default Message;