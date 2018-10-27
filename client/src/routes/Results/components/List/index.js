import React from 'react';
import ReactDOM from 'react-dom';
import classes from './styles.scss';
import classNames from 'classnames';
import { List, Spin, Icon } from 'antd';
import general from 'utils/general';

const IconText = ({ type, text }) => (
  <span>
    <Icon type={type} style={{ marginRight: 8 }} />
    {text}
  </span>
);

export default class ResultsList extends React.Component {
  render() {
    if (this.props.data) {
      return (
        <List
          itemLayout="vertical"
          size="large"
          pagination={{
            pageSize: 8,
            className: classes.pagination,
          }}
          dataSource={this.props.data}
          renderItem={item => {
            const itemClasses = classNames(
              classes.item,
              { [classes.selected]: item.id == this.props.id }
            );

            const { keys, values } = general.splitData(general.convertAssociatedArrayToObjectArray(item.grades));
            const total = _.sum(values);
            
            return (
              <List.Item
                key={item.id}
                className={itemClasses}
                actions={[<IconText type="user" text={total} />]}
                onClick={() => this.props.onClick(item.id)}>
                <List.Item.Meta
                  title={<a href="javascript:void(0)">{item.course.prefix} {item.course.number}.{item.number}</a>}
                  description={`${item.professor.lastName}, ${item.professor.firstName} - ${item.course.semester.name}`}
                />
              </List.Item>
            );
          }}
        />
      );
    } else if (this.props.loading) {
      return (
        <List
          itemLayout="vertical"
          size="large"
          pagination={{
            pageSize: 8,
          }}>
          <List.Item className={classes.loadingItem}>
            <Spin />
          </List.Item>
        </List>
      );
    } else {
      return (
        <div>
          <p>Search for something!</p>
        </div>
      );
    }
  }
}
