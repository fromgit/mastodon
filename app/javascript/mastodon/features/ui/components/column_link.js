import React from 'react';
import PropTypes from 'prop-types';
import Link from 'react-router-dom/Link';

const ColumnLink = ({ icon, text, to, href, method, ...other }) => {
  if (href) {
    return (
      <a href={href} className='column-link' data-method={method} {...other}>
        <i className={`fa fa-fw fa-${icon} column-link__icon`} />
        {text}
      </a>
    );
  } else {
    return (
      <Link to={to} className='column-link'>
        <i className={`fa fa-fw fa-${icon} column-link__icon`} />
        {text}
      </Link>
    );
  }
};

ColumnLink.propTypes = {
  icon: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  to: PropTypes.string,
  href: PropTypes.string,
  method: PropTypes.string,
  hideOnMobile: PropTypes.bool,
};

export default ColumnLink;
