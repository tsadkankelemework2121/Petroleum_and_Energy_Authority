<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('vehicle_plate_number')->nullable()->after('company_id');
            $table->string('phone_number')->nullable()->after('vehicle_plate_number');
            $table->string('transporter_name')->nullable()->after('phone_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['vehicle_plate_number', 'phone_number', 'transporter_name']);
        });
    }
};
