# Tastio - Supply Chain Ordering Platform

A comprehensive full-stack food ordering platform connecting home-based food vendors with customers in Kano metropolitan areas. Built with modern technologies and featuring a complete user management system, real-time notifications, and comprehensive analytics.

## 🍽️ Features

### For Customers
- **User Registration & Authentication**: Secure registration and login with email/phone
- **Browse & Search**: Discover meals with advanced search and filtering
- **Vendor Profiles**: View detailed vendor information, menus, and ratings
- **Order Management**: Place orders with delivery/pickup options and track real-time status
- **Payment System**: Multiple payment methods (Cash on Delivery, Bank Transfer, Card Payment, Mobile Money)
- **Reviews & Ratings**: Rate and review vendors and meals
- **Messaging System**: Communicate with vendors and admins for complaints, suggestions, and inquiries
- **Notifications**: Real-time notifications for order updates, payments, and messages
- **Profile Management**: Edit personal information and manage account settings

### For Vendors
- **Vendor Registration**: Complete registration with admin approval workflow
- **Profile Management**: Comprehensive profile setup with description, address, and profile pictures
- **Menu Management**: Add, edit, and manage meals with images, descriptions, and pricing
- **Order Management**: Accept, reject, and update order status with detailed workflow
- **Analytics Dashboard**: View sales statistics, revenue charts, and performance metrics
- **Customer Communication**: Message customers about orders and respond to inquiries
- **Real-time Notifications**: Get notified of new orders, customer messages, and system updates

### For Admins
- **User Management**: Comprehensive user management for customers, vendors, and admins
- **Vendor Approval System**: Approve or reject vendor applications with notifications
- **Analytics Dashboard**: Advanced analytics with revenue charts, top vendors, and customer insights
- **Content Moderation**: Manage users, meals, and orders across the platform
- **Messaging System**: Send bulk messages to users, vendors, or customers
- **System Notifications**: Create and manage system-wide notifications
- **Database Management**: Complete database setup and management tools

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React Icons
- **Charts**: Chart.js with react-chartjs-2
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **Notifications**: React Hot Toast
- **State Management**: React Hooks

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MySQL 8.0+
- **Authentication**: JWT Tokens with bcrypt
- **File Upload**: FastAPI UploadFile
- **Database ORM**: Custom DatabaseManager with connection pooling
- **Validation**: Pydantic models
- **CORS**: Cross-origin resource sharing enabled

### Database
- **Engine**: MySQL
- **Connection**: Connection pooling for performance
- **Schema**: Comprehensive schema with foreign keys and indexes
- **Management**: Automated setup and population scripts

## 📁 Project Structure

```
Tastio/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── admin/       # Admin dashboard and management
│   │   │   ├── vendor/      # Vendor dashboard and management
│   │   │   ├── meals/       # Meal browsing and details
│   │   │   ├── orders/      # Order management
│   │   │   ├── messages/    # Messaging system
│   │   │   └── profile/     # User profile management
│   │   ├── components/      # Reusable React components
│   │   ├── hooks/           # Custom React hooks
│   │   └── utils/           # Utility functions
│   ├── public/              # Static assets
│   └── uploads/             # File uploads directory
├── backend/                  # FastAPI backend application
│   ├── routers/             # API route handlers
│   ├── database.py          # Database connection and management
│   ├── auth.py              # Authentication and authorization
│   └── main.py              # FastAPI application entry point
├── database/                 # Database schema and migrations
├── db.py                     # Comprehensive database management script
├── updateddb.sql            # Complete database schema and sample data
└── README.md                # This file
```

## 🚀 Quick Start

### Prerequisites
- **Node.js**: 18+ 
- **Python**: 3.8+
- **MySQL**: 8.0+
- **Git**: For version control

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Tastio
```

### 2. Database Setup
```bash
# Option 1: Use the comprehensive setup script
python db.py complete-setup

# Option 2: Manual setup
mysql -u root -p < updateddb.sql
```

### 3. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py
```

### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📊 Database Schema

### Core Tables
- **users**: User accounts with role-based access (customer, vendor, admin)
- **vendors**: Vendor profiles with approval status and business details
- **meals**: Menu items with pricing, availability, and images
- **orders**: Order management with status tracking and payment information
- **reviews**: Customer ratings and reviews for vendors and meals
- **messages**: Messaging system for user communication
- **notifications**: Real-time notification system

### Advanced Features
- **Foreign Key Relationships**: Maintains data integrity
- **Indexes**: Optimized for performance
- **ENUM Types**: Status and role management
- **Timestamps**: Automatic created_at and updated_at tracking

## 🔐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User authentication
- `POST /api/auth/refresh` - Token refresh

### User Management
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/password` - Change password

### Vendor Management
- `GET /api/vendors` - List approved vendors
- `GET /api/vendors/{id}` - Get vendor details
- `POST /api/vendors/profile` - Create vendor profile
- `PUT /api/vendors/profile` - Update vendor profile
- `GET /api/vendors/stats` - Vendor analytics

### Meal Management
- `GET /api/meals` - List meals with filters
- `GET /api/meals/{id}` - Get meal details
- `POST /api/meals` - Add new meal (vendor only)
- `PUT /api/meals/{id}` - Update meal (vendor only)
- `DELETE /api/meals/{id}` - Delete meal (vendor only)

### Order Management
- `POST /api/orders` - Create new order
- `GET /api/orders` - List user orders
- `GET /api/orders/{id}` - Get order details
- `PUT /api/orders/{id}` - Update order status
- `GET /api/orders/vendor` - Vendor order management

### Messaging System
- `POST /api/messages` - Send message
- `GET /api/messages` - List messages
- `GET /api/messages/{id}` - Get message details
- `POST /api/messages/{id}/reply` - Reply to message
- `PUT /api/messages/{id}/status` - Update message status

### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/mark-read/{id}` - Mark notification as read
- `POST /api/notifications/create` - Create notification (admin only)

### Admin Endpoints
- `GET /api/admin/analytics/overview` - Admin dashboard analytics
- `GET /api/admin/analytics/top-vendors` - Top performing vendors
- `GET /api/admin/analytics/top-customers` - Top customers
- `GET /api/admin/users` - User management
- `POST /api/admin/users` - Create user (admin only)
- `DELETE /api/admin/users/{id}` - Delete user (admin only)
- `POST /api/admin/vendors/{id}/approve` - Approve vendor
- `POST /api/admin/vendors/{id}/reject` - Reject vendor

## 👥 Default Users

### Admin Users
- **Email**: admin@tastio.com | **Password**: admin123
- **Email**: khadijah@tastio.com | **Password**: Khadijah123

### Vendor Users
- **Email**: mamaaisha@example.com | **Password**: mama123
- **Email**: chefbello@example.com | **Password**: password123
- **Email**: chef1@tastio.com | **Password**: Mansur@

### Customer Users
- **Email**: john@example.com | **Password**: john123
- **Email**: fatima@example.com | **Password**: password123

## 🎯 Key Features

### Real-time Notifications
- Order status updates
- New message notifications
- Payment confirmations
- System announcements
- Pending vendor approvals (admin)

### Advanced Analytics
- Revenue tracking and charts
- Top performing vendors
- Customer spending analysis
- Order statistics
- Commission calculations

### Messaging System
- Customer-vendor communication
- Admin-user messaging
- Bulk messaging capabilities
- Message status tracking
- Complaint and suggestion handling

### Order Management
- Complete order lifecycle
- Status tracking (pending → accepted → preparing → ready → delivered)
- Payment status management
- Delivery coordination
- Special instructions handling

## 🔧 Database Management

### Using db.py Script
```bash
# Complete setup (schema + sample data)
python db.py complete-setup

# Individual operations
python db.py setup              # Setup database schema only
python db.py populate           # Populate sample data only
python db.py create-user        # Create new user
python db.py update-password    # Update user password
python db.py list-users         # List all users
python db.py stats              # Get database statistics
```

### Interactive Mode
```bash
python db.py
# Follow the interactive menu
```

## 🚀 Deployment

### Environment Variables
Create `.env` files in both frontend and backend directories:

**Backend (.env)**
```env
DATABASE_URL=mysql://root:@localhost/tastio_app
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Production Considerations
- Use environment variables for sensitive data
- Set up proper CORS configuration
- Configure database connection pooling
- Implement proper logging
- Set up SSL certificates
- Configure reverse proxy (nginx)

## 📱 Screenshots

[Coming soon - Add screenshots of key features]

## 🤝 Contributing

This is a comprehensive food ordering platform. Contributions are welcome for:
- Bug fixes
- Feature enhancements
- Documentation improvements
- Performance optimizations

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For support and questions:
- Check the API documentation at http://localhost:8000/docs
- Review the database schema in `updateddb.sql`
- Use the database management script `db.py`

## 🎉 Acknowledgments

Built with modern web technologies to provide a seamless food ordering experience for the Kano metropolitan area.
